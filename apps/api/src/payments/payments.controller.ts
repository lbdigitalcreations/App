import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentType, RoleName } from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('razorpay/order')
  @UseGuards(JwtAuthGuard)
  createRazorpayOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId: string; paymentType: PaymentType },
  ) {
    return this.payments.createRazorpayOrder(user.id, body.orderId, body.paymentType);
  }

  @Post('razorpay/verify')
  @UseGuards(JwtAuthGuard)
  verifyRazorpay(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    return this.payments.verifyRazorpayPayment(user.id, body);
  }

  @Post('razorpay/webhook')
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.payments.handleRazorpayWebhook(raw, signature, eventId);
  }

  @Post('manual-upi')
  @UseGuards(JwtAuthGuard)
  submitManualUpi(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      orderId: string;
      paymentType: PaymentType;
      upiReferenceId: string;
      upiProofAssetId?: string;
    },
  ) {
    return this.payments.submitManualUpi(user.id, body);
  }

  @Post('admin/:id/verify-upi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  verifyManualUpi(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { approve: boolean; note?: string },
  ) {
    return this.payments.adminVerifyManualUpi(user.id, id, body.approve, body.note);
  }

  @Post('admin/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  refund(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.payments.recordRefund(user.id, id, body.amount, body.reason);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query('orderId') orderId?: string) {
    return this.payments.listPayments(user.id, user.role, orderId);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  invoices(@CurrentUser() user: AuthUser) {
    return this.payments.listInvoices(user.id, user.role);
  }

  @Get('invoices/:id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadInvoicePdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, invoiceNumber } = await this.payments.generateInvoicePdf(
      user.id,
      user.role,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    return res.send(buffer);
  }
}
