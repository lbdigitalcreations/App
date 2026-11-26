import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RoleName } from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    const tenantId = user.tenantId;
    const [
      totalOrders,
      newOrders,
      activeProjects,
      completedProjects,
      totalCustomers,
      orders,
      recentActivities,
    ] = await Promise.all([
      this.prisma.order.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.order.count({ where: { tenantId, orderStatus: 'SUBMITTED', deletedAt: null } }),
      this.prisma.project.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.project.count({ where: { tenantId, status: 'COMPLETED', deletedAt: null } }),
      this.prisma.user.count({
        where: { tenantId, deletedAt: null, role: { name: RoleName.CUSTOMER } },
      }),
      this.prisma.order.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          totalPrice: true,
          amountPaid: true,
          balanceAmount: true,
          orderStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const grossRevenue = orders.reduce((s, o) => s + Number(o.totalPrice), 0);
    const collectedPayments = orders.reduce((s, o) => s + Number(o.amountPaid), 0);
    const outstandingBalances = orders.reduce((s, o) => s + Number(o.balanceAmount), 0);

    const statusCounts: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] || 0) + 1;
      const monthKey = o.createdAt.toISOString().slice(0, 7);
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(o.amountPaid);
    }

    return {
      kpis: {
        totalOrders,
        newOrders,
        activeProjects,
        completedProjects,
        totalCustomers,
        grossRevenue,
        collectedPayments,
        outstandingBalances,
      },
      orderStatusGraph: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      monthlyRevenueGraph: Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month, revenue })),
      recentActivities,
    };
  }

  @Get('customers')
  async customers(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
      role: { name: RoleName.CUSTOMER },
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        profile: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('customers/:id/status')
  toggleCustomer(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
  }

  @Get('reports/export')
  async exportReport(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const where: any = { tenantId: user.tenantId, deletedAt: null };
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: { service: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Order Number,Customer,Email,Service,Total,Paid,Balance,Payment Status,Order Status,Created At\n';
    const rows = orders
      .map((o) =>
        [
          o.orderNumber,
          `"${o.customerName.replace(/"/g, '""')}"`,
          o.customerEmail,
          `"${o.service.title.replace(/"/g, '""')}"`,
          o.totalPrice,
          o.amountPaid,
          o.balanceAmount,
          o.paymentStatus,
          o.orderStatus,
          o.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="lbdc-orders-report.csv"');
    return res.send(header + rows);
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.siteSetting.findMany({ where: { tenantId: user.tenantId } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  @Put('settings/:key')
  updateSetting(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() value: Record<string, unknown>,
  ) {
    return this.prisma.siteSetting.upsert({
      where: { tenantId_key: { tenantId: user.tenantId, key } },
      update: { value: value as any },
      create: { tenantId: user.tenantId, key, value: value as any },
    });
  }

  @Get('tenants')
  listTenants() {
    return this.prisma.tenant.findMany({
      include: { subscriptions: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}

@Module({
  controllers: [AdminController],
})
export class AdminModule {}
