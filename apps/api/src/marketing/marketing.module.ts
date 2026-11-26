import { Body, Controller, Get, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('referrals/me')
  @UseGuards(JwtAuthGuard)
  async myReferrals(@CurrentUser() user: AuthUser) {
    const [dbUser, referrals, rewards] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }),
      this.prisma.referral.findMany({
        where: { referrerId: user.id },
        include: { referredUser: { select: { email: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referralReward.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.rewardAmount), 0);
    return {
      referralCode: dbUser?.referralCode,
      referralLink: `https://lbdigitalcreations.in/register?ref=${dbUser?.referralCode}`,
      referrals,
      rewards,
      totalEarned,
    };
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  async submitReview(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId?: string; customerName: string; rating: number; title?: string; comment: string },
  ) {
    return this.prisma.review.create({
      data: {
        userId: user.id,
        orderId: body.orderId ?? null,
        customerName: body.customerName,
        rating: Math.min(5, Math.max(1, Number(body.rating || 5))),
        title: body.title ?? null,
        comment: body.comment,
        isPublished: false,
      },
    });
  }

  // Admin endpoints
  @Get('admin/coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  listCoupons(@CurrentUser() user: AuthUser) {
    return this.prisma.coupon.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('admin/coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createCoupon(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.prisma.coupon.create({
      data: {
        tenantId: user.tenantId,
        code: String(body.code).trim().toUpperCase(),
        description: body.description,
        discountType: body.discountType || 'PERCENT',
        discountValue: Number(body.discountValue),
        minOrderAmount: Number(body.minOrderAmount || 0),
        maxDiscountAmt: body.maxDiscountAmt ? Number(body.maxDiscountAmt) : null,
        usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isActive: body.isActive ?? true,
      },
    });
  }

  @Patch('admin/coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updateCoupon(@Param('id') id: string, @Body() body: any) {
    return this.prisma.coupon.update({ where: { id }, data: body });
  }

  @Get('admin/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  listAllReviews() {
    return this.prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Patch('admin/reviews/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  moderateReview(@Param('id') id: string, @Body('isPublished') isPublished: boolean) {
    return this.prisma.review.update({ where: { id }, data: { isPublished } });
  }
}

@Module({
  controllers: [MarketingController],
})
export class MarketingModule {}
