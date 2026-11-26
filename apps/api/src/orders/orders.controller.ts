import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CreateOrderInput, CreateOrderSchema, RoleName } from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('validate-coupon')
  validateCoupon(
    @CurrentUser() user: AuthUser,
    @Body() body: { code: string; subtotal: number },
  ) {
    return this.orders.validateCoupon(user.tenantId, body.code, Number(body.subtotal || 0));
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CreateOrderSchema)) body: CreateOrderInput,
  ) {
    return this.orders.createOrder(user.id, user.tenantId, body);
  }

  @Get()
  listMyOrders(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.orders.listCustomerOrders(user.id, search);
  }

  @Get('support/tickets')
  listTickets(@CurrentUser() user: AuthUser) {
    return this.orders.listSupportTickets(user.id, user.role);
  }

  @Post('support/tickets')
  createTicket(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId?: string; subject: string; message: string },
  ) {
    return this.orders.createSupportTicket(user.id, body);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  adminList(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.orders.listAdminOrders({ status, paymentStatus, search });
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  adminUpdate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.orders.adminUpdateOrder(user.id, id, body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.getOrderDetail(user.id, user.role, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.cancelOrder(user.id, id);
  }
}
