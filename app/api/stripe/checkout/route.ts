import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getStripePriceId, isSubscriptionActiveStatus } from '@/lib/billing.server';
import { type BillingInterval, slugToPlan } from '@/lib/plans';

export const runtime = 'nodejs';

type CheckoutRequestBody = {
  plan?: string;
  interval?: BillingInterval;
};

function getAppOrigin(request: NextRequest): string {
  return request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  const [session, error] = await getAuthSession();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  const interval = body.interval === 'year' ? 'year' : 'month';
  const selectedPlan = slugToPlan(body.plan || '');

  if (selectedPlan === 'FREE') {
    return NextResponse.json(
      { error: 'Select a paid plan to start checkout.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeCustomerId: true,
      subscriptionStatus: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.plan !== 'FREE' && isSubscriptionActiveStatus(user.subscriptionStatus)) {
    return NextResponse.json(
      { error: 'You already have an active subscription. Open the billing portal to manage your plan.' },
      { status: 409 }
    );
  }

  const priceId = getStripePriceId(selectedPlan, interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Missing Stripe price id for ${selectedPlan.toLowerCase()} (${interval}). Set STRIPE_PRICE_${selectedPlan}_${interval === 'month' ? 'MONTHLY' : 'YEARLY'}.`,
      },
      { status: 500 }
    );
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    customerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = getAppOrigin(request);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    success_url: `${origin}/profile?tab=subscription&billing=success`,
    cancel_url: `${origin}/pricing?billing=cancelled`,
    metadata: {
      userId: user.id,
      plan: selectedPlan,
      interval,
      priceId,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: selectedPlan,
        interval,
        priceId,
      },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: 'Could not create Stripe checkout session.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}
