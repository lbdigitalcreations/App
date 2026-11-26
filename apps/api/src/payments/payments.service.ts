import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import PDFDocument from 'pdfkit';
import {
  NotificationEvent,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  ProjectStatus,
} from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private getRazorpayClient() {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured. Use Admin-approved Manual UPI or configure Razorpay keys.',
      );
    }
    return { client: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret };
  }

  private computePayableAmount(order: any, paymentType: PaymentType): number {
    const total = Number(order.totalPrice);
    const paid = Number(order.amountPaid);
    const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);

    if (remaining <= 0) {
      throw new BadRequestException('This order is already fully paid');
    }

    if (paymentType === PaymentType.ADVANCE) {
      if (paid >= Number(order.advanceAmount)) {
        throw new BadRequestException('Advance payment has already been settled');
      }
      return Number(order.advanceAmount);
    }

    return remaining;
  }

  async createRazorpayOrder(userId: string, orderId: string, paymentType: PaymentType) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');

    const amountInr = this.computePayableAmount(order, paymentType);
    const { client, keyId } = this.getRazorpayClient();

    const rzpOrder = await client.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `${order.orderNumber}-${paymentType}`,
      notes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        paymentType,
        provider: 'RAZORPAY',
        amount: amountInr,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: rzpOrder.id,
      },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: rzpOrder.id,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      keyId,
    };
  }

  async verifyRazorpayPayment(
    userId: string,
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: body.razorpayOrderId },
      include: { order: true },
    });
    if (!payment || payment.order.customerId !== userId) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === 'VERIFIED') {
      return { verified: true, duplicate: true, payment };
    }

    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new ServiceUnavailableException('RAZORPAY_KEY_SECRET is not configured');
    }

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
      .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(body.razorpaySignature),
    );

    if (!valid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      await this.notifications.dispatch({
        userId: payment.order.customerId,
        event: NotificationEvent.PAYMENT_FAILURE,
        title: 'Payment Verification Failed',
        body: `Your payment for order ${payment.order.orderNumber} could not be verified.`,
      });
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    return this.finalizeVerifiedPayment(payment.id, {
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });
  }

  async handleRazorpayWebhook(rawBody: Buffer, signature: string, eventId?: string) {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ServiceUnavailableException('RAZORPAY_WEBHOOK_SECRET is not configured');
    }

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!signature || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const uniqueEventId = eventId || `${payload.event}:${payload?.payload?.payment?.entity?.id || ''}`;

    // Idempotency / duplicate webhook protection
    const duplicate = await this.prisma.payment.findFirst({
      where: { webhookEventId: uniqueEventId },
    });
    if (duplicate) {
      return { processed: true, duplicate: true };
    }

    if (payload.event === 'payment.captured') {
      const entity = payload.payload?.payment?.entity;
      if (entity?.order_id) {
        const payment = await this.prisma.payment.findUnique({
          where: { razorpayOrderId: entity.order_id },
        });
        if (payment && payment.status !== 'VERIFIED') {
          await this.finalizeVerifiedPayment(payment.id, {
            razorpayPaymentId: entity.id,
            webhookEventId: uniqueEventId,
          });
        }
      }
    }

    return { processed: true, duplicate: false };
  }

  async submitManualUpi(
    userId: string,
    body: {
      orderId: string;
      paymentType: PaymentType;
      upiReferenceId: string;
      upiProofAssetId?: string;
    },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: body.orderId, customerId: userId, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!body.upiReferenceId || body.upiReferenceId.trim().length < 6) {
      throw new BadRequestException('Valid UPI UTR / Reference ID is required');
    }

    const amountInr = this.computePayableAmount(order, body.paymentType);

    // Never mark verified on submission alone — awaits explicit admin approval
    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        paymentType: body.paymentType,
        provider: 'MANUAL_UPI',
        amount: amountInr,
        currency: 'INR',
        status: 'PENDING',
        upiReferenceId: body.upiReferenceId.trim(),
        upiProofAssetId: body.upiProofAssetId ?? null,
      },
    });
  }

  async adminVerifyManualUpi(adminId: string, paymentId: string, approve: boolean, note?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'VERIFIED') {
      return { verified: true, duplicate: true, payment };
    }

    if (!approve) {
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          verifiedByAdminId: adminId,
          metadata: { rejectionNote: note || 'Manual UPI verification rejected by admin' },
        },
      });
    }

    return this.finalizeVerifiedPayment(payment.id, { verifiedByAdminId: adminId });
  }

  async finalizeVerifiedPayment(
    paymentId: string,
    extra: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      webhookEventId?: string;
      verifiedByAdminId?: string;
    },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: { service: true, project: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'VERIFIED') {
      return { verified: true, duplicate: true, payment };
    }

    const order = payment.order;
    const newAmountPaid = Math.round((Number(order.amountPaid) + Number(payment.amount)) * 100) / 100;
    const newBalance = Math.max(0, Math.round((Number(order.totalPrice) - newAmountPaid) * 100) / 100);
    const newPaymentStatus =
      newBalance <= 0 ? PaymentStatus.FULLY_PAID : PaymentStatus.ADVANCE_PAID;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          ...extra,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          amountPaid: newAmountPaid,
          balanceAmount: newBalance,
          paymentStatus: newPaymentStatus,
          ...(order.orderStatus === OrderStatus.SUBMITTED
            ? { orderStatus: OrderStatus.ACCEPTED }
            : {}),
        },
      });

      if (order.project) {
        const nextProjStatus =
          order.project.status === ProjectStatus.PAYMENT_PENDING
            ? ProjectStatus.PAYMENT_VERIFIED
            : order.project.status === ProjectStatus.BALANCE_PENDING && newBalance <= 0
              ? ProjectStatus.PUBLISHING
              : order.project.status;

        if (nextProjStatus !== order.project.status) {
          await tx.project.update({
            where: { id: order.project.id },
            data: {
              status: nextProjStatus,
              progressPercent: Math.max(order.project.progressPercent, nextProjStatus === ProjectStatus.PAYMENT_VERIFIED ? 20 : 85),
              updates: {
                create: {
                  fromStatus: order.project.status,
                  toStatus: nextProjStatus,
                  note: `Payment of ₹${payment.amount} verified (${payment.provider}).`,
                  actorId: extra.verifiedByAdminId ?? order.customerId,
                },
              },
            },
          });
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          paymentId: payment.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          serviceTitle: order.service.title,
          subtotal: Number(order.basePrice) + Number(order.addOnsTotal) + Number(order.additionalCharges),
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalPrice,
          amountPaid: newAmountPaid,
          balanceAmount: newBalance,
          paymentStatus: newPaymentStatus,
        },
      });

      // Qualify referral reward ONLY after verified payment, preventing duplicates & self-referral
      const referral = await tx.referral.findUnique({
        where: { referredUserId: order.customerId },
      });
      if (referral && referral.referrerId !== order.customerId && referral.status === 'REGISTERED') {
        await tx.referral.update({
          where: { id: referral.id },
          data: { status: 'QUALIFIED', qualifiedAt: new Date() },
        });
        await tx.referralReward.create({
          data: {
            referralId: referral.id,
            userId: referral.referrerId,
            orderId: order.id,
            rewardAmount: 250,
            status: 'CREDITED',
          },
        });
      }

      return { payment: updatedPayment, order: updatedOrder, invoice };
    });

    await this.notifications.dispatch({
      userId: order.customerId,
      event: NotificationEvent.PAYMENT_VERIFICATION,
      title: `Payment Verified — ₹${payment.amount}`,
      body: `Your ${payment.paymentType} payment for order ${order.orderNumber} has been verified. Invoice ${invoiceNumber} is ready.`,
      data: { orderId: order.id, invoiceId: result.invoice.id },
    });

    await this.audit.log({
      tenantId: order.tenantId,
      actorId: extra.verifiedByAdminId ?? order.customerId,
      action: 'PAYMENT_VERIFIED',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { orderId: order.id, amount: Number(payment.amount), invoiceNumber },
    });

    return { verified: true, ...result };
  }

  async recordRefund(adminId: string, paymentId: string, amount: number, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment || payment.status !== 'VERIFIED') {
      throw new BadRequestException('Only verified payments can be refunded');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundAmount: amount,
        refundReason: reason,
        refundedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.REFUNDED, orderStatus: OrderStatus.REFUNDED },
    });

    await this.audit.log({
      tenantId: payment.order.tenantId,
      actorId: adminId,
      action: 'PAYMENT_REFUNDED',
      entityType: 'Payment',
      entityId: paymentId,
      metadata: { amount, reason },
    });

    return updated;
  }

  async listPayments(userId: string, role: string, orderId?: string) {
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return this.prisma.payment.findMany({
      where: {
        ...(orderId ? { orderId } : {}),
        ...(isAdmin ? {} : { order: { customerId: userId } }),
      },
      include: {
        order: { select: { orderNumber: true, customerName: true, customerEmail: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listInvoices(userId: string, role: string) {
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return this.prisma.invoice.findMany({
      where: isAdmin ? {} : { order: { customerId: userId } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async generateInvoicePdf(userId: string, role: string, invoiceId: string): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && invoice.order.customerId !== userId) {
      throw new ForbiddenException('Access denied to this invoice');
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // LBDC Gold & White Invoice Header
      doc.fontSize(22).fillColor('#C5A15A').text('LB DIGITAL CREATIONS', { align: 'left' });
      doc.fontSize(10).fillColor('#777777').text('Creating Websites for Your Special Moments');
      doc.text('https://lbdigitalcreations.in | lbdigitalcreations7326@gmail.com | +91 63813 66088');
      doc.moveDown();

      doc.fontSize(16).fillColor('#202020').text(`INVOICE #${invoice.invoiceNumber}`);
      doc.fontSize(10).fillColor('#555555').text(`Order ID: ${invoice.order.orderNumber}`);
      doc.text(`Issue Date: ${invoice.issuedAt.toISOString().split('T')[0]}`);
      doc.text(`Payment Status: ${invoice.paymentStatus}`);
      doc.moveDown();

      doc.fontSize(12).fillColor('#202020').text('Billed To:');
      doc.fontSize(10).fillColor('#444444').text(invoice.customerName);
      doc.text(invoice.customerEmail);
      doc.text(invoice.customerPhone);
      doc.moveDown();

      doc.fontSize(12).fillColor('#202020').text('Service & Financial Summary');
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Service: ${invoice.serviceTitle}`);
      doc.text(`Subtotal: INR ${Number(invoice.subtotal).toFixed(2)}`);
      doc.text(`Discount: - INR ${Number(invoice.discountAmount).toFixed(2)}`);
      doc.text(`Tax: INR ${Number(invoice.taxAmount).toFixed(2)}`);
      doc.fontSize(11).fillColor('#202020').text(`Total Amount: INR ${Number(invoice.totalAmount).toFixed(2)}`);
      doc.fillColor('#1E7E4E').text(`Amount Paid: INR ${Number(invoice.amountPaid).toFixed(2)}`);
      doc.fillColor('#B87A14').text(`Remaining Balance: INR ${Number(invoice.balanceAmount).toFixed(2)}`);
      doc.moveDown(2);

      doc.fontSize(9).fillColor('#777777').text(
        'Thank you for choosing LB Digital Creations. This is a computer-generated invoice.',
        { align: 'center' },
      );

      doc.end();
    });

    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }
}
