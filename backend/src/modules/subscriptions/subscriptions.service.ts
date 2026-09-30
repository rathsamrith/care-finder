import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CheckoutDto } from './dto/checkout.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { isSubscriptionActive } from '../sites/site-config.util';

// Redesign vs. the original Laravel SubscribePaymentController (see
// MIGRATION_ROADMAP.md "Known bugs / drift"): that controller accepted raw
// card numbers (`number`, `exp_month`, `exp_year`, `cvc`) in the request
// body and hardcoded the payment method to the Stripe test value
// `pm_card_visa` - a PCI-compliance problem and clearly leftover test code.
// This implementation never sees raw card data server-side: the frontend
// collects card details with Stripe.js/Elements, and the two endpoints here
// only ever exchange PaymentIntent ids and a client secret.
//
// Flow:
//   1. POST /subscription/checkout - server creates a PaymentIntent for the
//      plan's price (looked up server-side, never client-supplied) and
//      returns its client secret. The frontend confirms it client-side.
//   2. POST /subscription/confirm - server re-fetches the PaymentIntent from
//      Stripe and only persists a SubscribePayment row once Stripe itself
//      reports `status === 'succeeded'`, so a client can't fabricate a fake
//      successful payment.
@Injectable()
export class SubscriptionsService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    // Constructed once per instance. If STRIPE_SECRET_KEY is missing at
    // startup this is intentionally NOT fatal - the app still boots, and
    // any actual Stripe call below will fail with Stripe's own clear error
    // (e.g. "Invalid API Key provided: undefined") rather than a fallback
    // key silently working against the wrong account.
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }

  async checkout(user: AuthenticatedUser, dto: CheckoutDto) {
    const plan = await this.prisma.subscribePlan.findUnique({
      where: { id: BigInt(dto.subscribePlanId) },
    });
    if (!plan) {
      throw new NotFoundException('Subscribe plan not found');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      // Stripe amounts are in the smallest currency unit (e.g. cents).
      amount: Math.round(plan.price * 100),
      currency: plan.currency,
      confirm: false,
      metadata: {
        userId: user.id.toString(),
        subscribePlanId: plan.id.toString(),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirm(user: AuthenticatedUser, dto: ConfirmPaymentDto) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(dto.paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment has not succeeded (status: ${paymentIntent.status})`,
      );
    }

    // Trust only what the server itself wrote into the PaymentIntent's
    // metadata during /checkout - never a client-resupplied plan id.
    const metadataUserId = paymentIntent.metadata?.userId;
    const metadataPlanId = paymentIntent.metadata?.subscribePlanId;
    if (!metadataUserId || !metadataPlanId) {
      throw new BadRequestException('Payment intent is missing subscription metadata');
    }
    if (metadataUserId !== user.id.toString()) {
      throw new ForbiddenException('This payment does not belong to the current user');
    }

    const plan = await this.prisma.subscribePlan.findUnique({
      where: { id: BigInt(metadataPlanId) },
    });
    if (!plan) {
      throw new NotFoundException('Subscribe plan not found');
    }

    // Avoid creating a duplicate row if /confirm is called twice for the
    // same PaymentIntent (e.g. a retried client request).
    const existing = await this.prisma.subscribePayment.findFirst({
      where: { paymentId: paymentIntent.id },
    });
    if (existing) {
      return existing;
    }

    const paymentMethod =
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : (paymentIntent.payment_method?.id ?? null);

    return this.prisma.subscribePayment.create({
      data: {
        paymentId: paymentIntent.id,
        userId: user.id,
        subscribePlanId: plan.id,
        name: plan.name,
        paymentMethod,
        paymentType: 'card',
        payerEmail: user.email,
        amount: plan.price,
      },
    });
  }

  async list(user: AuthenticatedUser, queryUserId?: number) {
    const isAdmin = user.roles.includes('admin');
    const userId = isAdmin && queryUserId !== undefined ? BigInt(queryUserId) : user.id;

    return this.prisma.subscribePayment.findMany({
      where: { userId },
      include: { subscribePlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Entitlement check for gated features (e.g. premium site templates).
  // Derived from payment history - there is no stored "active plan" column.
  async hasActiveSubscription(userId: bigint): Promise<boolean> {
    const payments = await this.prisma.subscribePayment.findMany({
      where: { userId },
      include: { subscribePlan: { select: { duration: true } } },
    });
    return isSubscriptionActive(payments);
  }
}
