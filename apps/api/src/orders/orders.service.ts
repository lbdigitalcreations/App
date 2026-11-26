import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  calculateOrderPricing,
  CreateOrderInput,
  NotificationEvent,
  OrderStatus,
  PaymentStatus,
  ProjectStatus,
} from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async validateCoupon(tenantId: string, code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        tenantId,
        code: code.trim().toUpperCase(),
        isActive: true,
      },
    });
    if (!coupon) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      );
    }

    let discountAmount =
      coupon.discountType === 'PERCENT'
        ? (subtotal * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);

    if (coupon.maxDiscountAmt) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmt));
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountAmount,
      description: coupon.description,
    };
  }

  async createOrder(userId: string, tenantId: string, input: CreateOrderInput) {
    const [service, template, pkg, policiesSetting] = await Promise.all([
      this.prisma.service.findFirst({ where: { id: input.serviceId, tenantId, isActive: true } }),
      this.prisma.template.findFirst({ where: { id: input.templateId, tenantId, isActive: true } }),
      this.prisma.package.findFirst({ where: { id: input.packageId, tenantId, isActive: true } }),
      this.prisma.siteSetting.findUnique({ where: { tenantId_key: { tenantId, key: 'policies' } } }),
    ]);

    if (!service || !template || !pkg) {
      throw new BadRequestException('Selected service, template, or package is unavailable');
    }

    const additionalFeatures = (service.additionalFeatures as Array<{ id: string; label: string; price: number }>) || [];
    const selectedAddOns = additionalFeatures.filter((f) => input.selectedAddOnIds.includes(f.id));
    const addOnsTotal = selectedAddOns.reduce((acc, item) => acc + Number(item.price || 0), 0);

    const basePrice = Number(pkg.price);
    const pkgDiscount = (basePrice * Number(pkg.discountPercent || 0)) / 100;

    let couponId: string | null = null;
    let couponDiscount = 0;
    if (input.couponCode) {
      const validated = await this.validateCoupon(tenantId, input.couponCode, basePrice + addOnsTotal);
      couponId = validated.couponId;
      couponDiscount = validated.discountAmount;
    }

    const policies = (policiesSetting?.value as any) || {};
    const pricing = calculateOrderPricing({
      basePrice,
      addOnsTotal,
      discountAmount: pkgDiscount + couponDiscount,
      taxPercent: Number(policies.taxPercent ?? 0),
      advancePercent: Number(policies.advancePercent ?? 50),
    });

    const orderNumber = `LBDC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const projectRef = `PRJ-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          tenantId,
          customerId: userId,
          serviceId: service.id,
          templateId: template.id,
          packageId: pkg.id,
          couponId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          basePrice: pricing.basePrice,
          addOnsTotal: pricing.addOnsTotal,
          discountAmount: pricing.discountAmount,
          taxAmount: pricing.taxAmount,
          totalPrice: pricing.totalPrice,
          advanceAmount: pricing.advanceAmount,
          balanceAmount: pricing.balanceAmount,
          paymentStatus: PaymentStatus.PENDING,
          orderStatus: OrderStatus.SUBMITTED,
          deadlineAt: new Date(Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000),
          requirements: {
            create: {
              celebrationTitle: input.customization.celebrationTitle,
              honoreeNames: input.customization.honoreeNames,
              eventDate: input.customization.eventDate,
              eventTime: input.customization.eventTime ?? null,
              venueName: input.customization.venueName ?? null,
              venueAddress: input.customization.venueAddress ?? null,
              mapsUrl: input.customization.mapsUrl || null,
              description: input.customization.description ?? null,
              themeColor: input.customization.themeColor,
              animationStyle: input.customization.animationStyle,
              musicTrackId: input.customization.musicTrackId ?? null,
              countdownEnabled: input.customization.countdownEnabled,
              galleryEnabled: input.customization.galleryEnabled,
              rsvpEnabled: input.customization.rsvpEnabled,
              wishesEnabled: input.customization.wishesEnabled,
              itinerary: input.customization.itinerary as any,
              selectedAddOns: selectedAddOns as any,
              requirementsText: input.requirementsText ?? input.customization.customNotes ?? null,
            },
          },
        },
        include: {
          requirements: true,
          service: true,
          template: true,
          package: true,
        },
      });

      const allAssetIds = [
        ...input.customization.photoAssetIds,
        ...input.customization.videoAssetIds,
      ];
      if (allAssetIds.length > 0) {
        await tx.mediaAsset.updateMany({
          where: { id: { in: allAssetIds }, userId },
          data: { orderId: order.id },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      const project = await tx.project.create({
        data: {
          referenceNumber: projectRef,
          tenantId,
          orderId: order.id,
          status: ProjectStatus.PAYMENT_PENDING,
          progressPercent: 5,
          description: `${service.title} — ${input.customization.celebrationTitle}`,
          dueDate: order.deadlineAt,
          milestones: [
            { key: 'advance', label: '50% Advance Payment', completed: false },
            { key: 'design', label: 'Design & Content Crafting', completed: false },
            { key: 'preview', label: 'Interactive Preview Delivery', completed: false },
            { key: 'approval', label: 'Customer Approval & Balance', completed: false },
            { key: 'publish', label: 'Live Website Publication', completed: false },
          ],
          updates: {
            create: {
              fromStatus: null,
              toStatus: ProjectStatus.PAYMENT_PENDING,
              note: 'Order submitted. Awaiting 50% advance payment.',
              actorId: userId,
            },
          },
        },
      });

      return { order, project };
    });

    await this.notifications.dispatch({
      userId,
      event: NotificationEvent.NEW_ORDER,
      title: `Order ${orderNumber} Received`,
      body: `Thank you! Your order for "${input.customization.celebrationTitle}" has been created. Please complete your 50% advance payment of ₹${pricing.advanceAmount}.`,
      data: { orderId: result.order.id, orderNumber },
    });

    await this.audit.log({
      tenantId,
      actorId: userId,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: result.order.id,
      metadata: { orderNumber, totalPrice: pricing.totalPrice },
    });

    return result;
  }

  async listCustomerOrders(userId: string, search?: string) {
    const where: any = { customerId: userId, deletedAt: null };
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { requirements: { celebrationTitle: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { title: true, slug: true } },
        template: { select: { name: true, coverImageUrl: true } },
        package: { select: { name: true } },
        project: { select: { id: true, referenceNumber: true, status: true, progressPercent: true, previewUrl: true, finalUrl: true } },
        requirements: true,
      },
    });
  }

  async getOrderDetail(userId: string, role: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        service: true,
        template: true,
        package: true,
        requirements: true,
        mediaAssets: true,
        payments: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        project: {
          include: {
            updates: { orderBy: { createdAt: 'desc' } },
            revisions: { orderBy: { createdAt: 'desc' } },
            celebrationSite: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && order.customerId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId, deletedAt: null },
      include: { project: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      order.orderStatus !== OrderStatus.SUBMITTED ||
      order.paymentStatus !== PaymentStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only unpaid submitted orders can be cancelled directly by customer',
      );
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCELLED },
      }),
      ...(order.project
        ? [
            this.prisma.project.update({
              where: { id: order.project.id },
              data: { status: ProjectStatus.CANCELLED },
            }),
          ]
        : []),
    ]);

    return { cancelled: true };
  }

  async createSupportTicket(userId: string, body: { orderId?: string; subject: string; message: string }) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        orderId: body.orderId ?? null,
        subject: body.subject,
        message: body.message,
      },
    });
  }

  async listSupportTickets(userId: string, role: string) {
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return this.prisma.supportTicket.findMany({
      where: isAdmin ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, profile: { select: { fullName: true } } } } },
    });
  }

  // Admin methods
  async listAdminOrders(params: { status?: string; paymentStatus?: string; search?: string }) {
    const where: any = { deletedAt: null };
    if (params.status) where.orderStatus = params.status;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { customerName: { contains: params.search, mode: 'insensitive' } },
        { customerEmail: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { title: true } },
        template: { select: { name: true } },
        package: { select: { name: true } },
        project: { select: { id: true, referenceNumber: true, status: true, progressPercent: true } },
        requirements: { select: { celebrationTitle: true, eventDate: true } },
      },
    });
  }

  async adminUpdateOrder(
    adminId: string,
    orderId: string,
    body: {
      orderStatus?: string;
      internalNotes?: string;
      rejectionReason?: string;
      deadlineAt?: string;
      additionalCharges?: number;
    },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const data: any = {};
    if (body.orderStatus) data.orderStatus = body.orderStatus;
    if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
    if (body.rejectionReason !== undefined) data.rejectionReason = body.rejectionReason;
    if (body.deadlineAt) data.deadlineAt = new Date(body.deadlineAt);

    if (body.additionalCharges !== undefined) {
      const pricing = calculateOrderPricing({
        basePrice: Number(order.basePrice),
        addOnsTotal: Number(order.addOnsTotal),
        additionalCharges: body.additionalCharges,
        discountAmount: Number(order.discountAmount),
        taxPercent: 0,
      });
      data.additionalCharges = pricing.additionalCharges;
      data.totalPrice = pricing.totalPrice;
      data.balanceAmount = Math.max(0, pricing.totalPrice - Number(order.amountPaid));
    }

    const updated = await this.prisma.order.update({ where: { id: orderId }, data });

    await this.audit.log({
      tenantId: order.tenantId,
      actorId: adminId,
      action: 'ADMIN_ORDER_UPDATED',
      entityType: 'Order',
      entityId: orderId,
      metadata: body,
    });

    return updated;
  }
}
