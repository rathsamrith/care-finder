import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';

// Mirrors the original `subscription/*` routes (see MIGRATION_ROADMAP.md's
// route mapping table) but replaces the single raw-card `POST
// subscription/payment` endpoint with a two-step, client-confirmed Stripe
// PaymentIntent flow. Restricted to the `hospital` role by default, matching
// the original app (only hospital accounts subscribe to plans) - except
// `GET list`, which also allows `admin` to look up any user's history via
// `?userId=`.
@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @HttpCode(200)
  @Roles('hospital')
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    return this.subscriptionsService.checkout(user, dto);
  }

  @Post('confirm')
  @HttpCode(200)
  @Roles('hospital')
  confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmPaymentDto) {
    return this.subscriptionsService.confirm(user, dto);
  }

  @Get('list')
  @Roles('hospital', 'admin')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPaymentsQueryDto) {
    return this.subscriptionsService.list(user, query.userId);
  }
}
