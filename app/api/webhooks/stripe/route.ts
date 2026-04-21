import type Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import {
  creditMonthlySubscription,
  getPlanFromStripePriceId,
  isSubscriptionActiveStatus,
  updateUserSubscription,
} from '@/lib/billing.server';
import { normalizeDbPlan } from '@/lib/plans';

export const runtime = 'nodejs';

function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

function getStripePriceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const firstItem = subscription.items.data[0];
  // In Stripe v22, price is on the subscription item
  const price = firstItem?.price;
  return (typeof price === 'string' ? price : price?.id) || null;
}

async function findUserForStripeEvent(params: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const userId = params.userId?.trim();
  if (userId) {
    const byId = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true },
    });
    if (byId) return byId;
  }

  if (params.subscriptionId) {
    const bySubscription = await prisma.user.findUnique({
      where: { stripeSubscriptionId: params.subscriptionId },
      select: { id: true, plan: true },
    });
    if (bySubscription) return bySubscription;
  }

  if (params.customerId) {
    const byCustomer = await prisma.user.findUnique({
      where: { stripeCustomerId: params.customerId },
      select: { id: true, plan: true },
    });
    if (byCustomer) return byCustomer;
  }

  return null;
}

async function syncSubscriptionToUser(subscription: Stripe.Subscription, userIdFromMetadata?: string | null) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || null;
  const subscriptionId = subscription.id;
  const priceId = getStripePriceIdFromSubscription(subscription);
  const resolvedPlan = getPlanFromStripePriceId(priceId)?.plan;

  const user = await findUserForStripeEvent({
    userId: userIdFromMetadata || subscription.metadata?.userId,
    customerId,
    subscriptionId,
  });

  if (!user) return;

  const status = subscription.status;
  // In Stripe v22, current_period_end is on the first subscription item
  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem?.current_period_end;
  const currentPeriodEnd =
    typeof periodEnd === 'number'
      ? new Date(periodEnd * 1000)
      : null;

  const active = isSubscriptionActiveStatus(status);
  const plan = active
    ? resolvedPlan || normalizeDbPlan(user.plan)
    : 'FREE';

  await updateUserSubscription({
    userId: user.id,
    plan,
    subscriptionStatus: status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionCurrentPeriodEnd: currentPeriodEnd,
    subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToUser(subscription, userId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In Stripe v22, subscription is accessed via invoice.parent.subscription_details.subscription
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) return;

  const subscriptionId =
    typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef.id;

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id || null;

  const reason = invoice.billing_reason;
  if (reason !== 'subscription_create' && reason !== 'subscription_cycle') {
    return;
  }

  // In Stripe v22, price is accessed via lineItem.pricing.price_details.price
  const firstLine = invoice.lines.data[0];
  const priceRef = firstLine?.pricing?.price_details?.price;
  const priceId = typeof priceRef === 'string' ? priceRef : (priceRef?.id || null);
  const mappedPlan = getPlanFromStripePriceId(priceId)?.plan;

  const userId = invoice.parent?.subscription_details?.metadata?.userId || null;

  const user = await findUserForStripeEvent({
    userId,
    customerId,
    subscriptionId,
  });

  if (!user) return;

  const plan = mappedPlan || normalizeDbPlan(user.plan);
  if (plan === 'FREE') return;

  await creditMonthlySubscription(user.id, plan);
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.billingWebhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: 'stripe',
        eventId,
      },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

async function markEventProcessed(event: Stripe.Event): Promise<void> {
  try {
    await prisma.billingWebhookEvent.create({
      data: {
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return;
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET' },
      { status: 500 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscriptionToUser(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        break;
    }

    await markEventProcessed(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
