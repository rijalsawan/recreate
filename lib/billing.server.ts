import type { Prisma, TransactionType } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { addCredits } from '@/lib/credits';
import {
  type BillingInterval,
  type DbPlan,
  FREE_ALLOWED_MODELS,
  FREE_DAILY_ACTION_LIMIT,
  FREE_DAILY_CREDITS,
  FREE_DAILY_UPLOAD_LIMIT,
  FREE_MAX_IMAGES_PER_REQUEST,
  MONTHLY_PLAN_CREDITS,
  normalizeDbPlan,
} from '@/lib/plans';

export type UsageOperation = 'generate' | 'edit' | 'tool' | 'upload';

const ACTION_OPERATIONS = new Set<UsageOperation>(['generate', 'edit', 'tool']);
const FREE_ALLOWED_MODEL_SET = new Set<string>(FREE_ALLOWED_MODELS);

const STRIPE_PRICE_IDS: Record<'PRO' | 'BUSINESS', Record<BillingInterval, string | undefined>> = {
  PRO: {
    month: process.env.STRIPE_PRICE_PRO_MONTHLY,
    year: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  BUSINESS: {
    month: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    year: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  },
};

const BILLING_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  credits: true,
  plan: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  subscriptionCancelAtPeriodEnd: true,
  dailyFreeActionsUsed: true,
  dailyUploadsUsed: true,
  dailyFreeResetAt: true,
} as const;

export type BillingUserSnapshot = Prisma.UserGetPayload<{
  select: typeof BILLING_USER_SELECT;
}>;

export type BillingGuardResult =
  | {
      ok: true;
      plan: DbPlan;
      user: BillingUserSnapshot;
    }
  | {
      ok: false;
      status: number;
      payload: Record<string, unknown>;
    };

export type GuardUsageOptions = {
  userId: string;
  operation: UsageOperation;
  creditsRequired?: number;
  model?: string;
  imageCount?: number;
  feature?: 'vectorize' | 'creative_upscale';
};

export type ConsumeUsageOptions = {
  userId: string;
  operation: UsageOperation;
  creditsUsed: number;
  transactionType: TransactionType;
  description?: string;
  relatedImageId?: string;
};

function getUtcDayStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getNextUtcDayStartIso(now: Date = new Date()): string {
  const dayStart = getUtcDayStart(now);
  dayStart.setUTCDate(dayStart.getUTCDate() + 1);
  return dayStart.toISOString();
}

async function resetDailyFreeUsageIfNeeded(user: BillingUserSnapshot): Promise<BillingUserSnapshot> {
  const plan = normalizeDbPlan(user.plan);
  if (plan !== 'FREE') return user;

  const now = new Date();
  const todayStart = getUtcDayStart(now);
  if (user.dailyFreeResetAt && user.dailyFreeResetAt.getTime() >= todayStart.getTime()) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      dailyFreeResetAt: now,
      dailyFreeActionsUsed: 0,
      dailyUploadsUsed: 0,
      credits: Math.max(user.credits, FREE_DAILY_CREDITS),
    },
    select: BILLING_USER_SELECT,
  });
}

export async function getBillingSnapshot(userId: string): Promise<BillingUserSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: BILLING_USER_SELECT,
  });

  if (!user) return null;
  return resetDailyFreeUsageIfNeeded(user);
}

export async function guardUsage(options: GuardUsageOptions): Promise<BillingGuardResult> {
  const user = await getBillingSnapshot(options.userId);
  if (!user) {
    return {
      ok: false,
      status: 404,
      payload: { error: 'User not found', code: 'USER_NOT_FOUND' },
    };
  }

  const plan = normalizeDbPlan(user.plan);
  const creditsRequired = Math.max(0, options.creditsRequired || 0);

  if (plan === 'FREE') {
    if (options.operation === 'upload' && user.dailyUploadsUsed >= FREE_DAILY_UPLOAD_LIMIT) {
      return {
        ok: false,
        status: 429,
        payload: {
          error: `Free plan allows ${FREE_DAILY_UPLOAD_LIMIT} uploads per day.`,
          code: 'FREE_UPLOAD_LIMIT_REACHED',
          limit: FREE_DAILY_UPLOAD_LIMIT,
          used: user.dailyUploadsUsed,
          resetAt: getNextUtcDayStartIso(),
        },
      };
    }

    if (ACTION_OPERATIONS.has(options.operation) && user.dailyFreeActionsUsed >= FREE_DAILY_ACTION_LIMIT) {
      return {
        ok: false,
        status: 429,
        payload: {
          error: `Free plan allows ${FREE_DAILY_ACTION_LIMIT} AI actions per day.`,
          code: 'FREE_ACTION_LIMIT_REACHED',
          limit: FREE_DAILY_ACTION_LIMIT,
          used: user.dailyFreeActionsUsed,
          resetAt: getNextUtcDayStartIso(),
        },
      };
    }

    if ((options.imageCount || 1) > FREE_MAX_IMAGES_PER_REQUEST) {
      return {
        ok: false,
        status: 403,
        payload: {
          error: `Free plan supports up to ${FREE_MAX_IMAGES_PER_REQUEST} image(s) per generation request.`,
          code: 'FREE_IMAGE_COUNT_LIMIT',
          limit: FREE_MAX_IMAGES_PER_REQUEST,
        },
      };
    }

    if (options.feature && (options.feature === 'vectorize' || options.feature === 'creative_upscale')) {
      return {
        ok: false,
        status: 403,
        payload: {
          error: 'This feature is available on paid plans only.',
          code: 'PREMIUM_FEATURE_REQUIRED',
          requiredPlan: 'PRO',
        },
      };
    }

    if (options.model && !FREE_ALLOWED_MODEL_SET.has(options.model)) {
      return {
        ok: false,
        status: 403,
        payload: {
          error: `${options.model} is available on paid plans only.`,
          code: 'PREMIUM_MODEL_REQUIRED',
          requiredPlan: 'PRO',
        },
      };
    }
  }

  if (user.credits < creditsRequired) {
    return {
      ok: false,
      status: 402,
      payload: {
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: creditsRequired,
        available: user.credits,
      },
    };
  }

  return {
    ok: true,
    plan,
    user,
  };
}

export async function consumeUsageAndCredits(options: ConsumeUsageOptions): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: options.userId },
      select: {
        plan: true,
      },
    });

    if (!current) {
      throw new Error('User not found while recording usage');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (options.creditsUsed > 0) {
      updateData.credits = { decrement: options.creditsUsed };
    }

    if (normalizeDbPlan(current.plan) === 'FREE') {
      if (options.operation === 'upload') {
        updateData.dailyUploadsUsed = { increment: 1 };
      }
      if (ACTION_OPERATIONS.has(options.operation)) {
        updateData.dailyFreeActionsUsed = { increment: 1 };
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: options.userId },
        data: updateData,
      });
    }

    if (options.creditsUsed > 0) {
      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount: -options.creditsUsed,
          type: options.transactionType,
          description: options.description,
          relatedImageId: options.relatedImageId,
        },
      });
    }
  });
}

export function getStripePriceId(plan: DbPlan, interval: BillingInterval): string | null {
  if (plan === 'FREE') return null;
  return STRIPE_PRICE_IDS[plan][interval] || null;
}

export function isStripeCheckoutConfigured(plan: DbPlan, interval: BillingInterval): boolean {
  return Boolean(getStripePriceId(plan, interval));
}

export function getPlanFromStripePriceId(priceId: string | null | undefined): { plan: DbPlan; interval: BillingInterval } | null {
  if (!priceId) return null;

  for (const [plan, intervals] of Object.entries(STRIPE_PRICE_IDS) as Array<[
    'PRO' | 'BUSINESS',
    Record<BillingInterval, string | undefined>
  ]>) {
    if (intervals.month === priceId) return { plan, interval: 'month' };
    if (intervals.year === priceId) return { plan, interval: 'year' };
  }

  return null;
}

export function getMonthlyCreditsForPlan(plan: DbPlan): number {
  return MONTHLY_PLAN_CREDITS[plan] || 0;
}

export function isSubscriptionActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export async function updateUserSubscription(options: {
  userId: string;
  plan: DbPlan;
  subscriptionStatus: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  subscriptionCancelAtPeriodEnd?: boolean;
}): Promise<void> {
  await prisma.user.update({
    where: { id: options.userId },
    data: {
      plan: options.plan,
      stripeCustomerId: options.stripeCustomerId ?? null,
      stripeSubscriptionId: options.stripeSubscriptionId ?? null,
      stripePriceId: options.stripePriceId ?? null,
      subscriptionStatus: options.subscriptionStatus,
      subscriptionCurrentPeriodEnd: options.subscriptionCurrentPeriodEnd ?? null,
      subscriptionCancelAtPeriodEnd: options.subscriptionCancelAtPeriodEnd ?? false,
    },
  });
}

export async function downgradeToFreePlan(userId: string): Promise<void> {
  await updateUserSubscription({
    userId,
    plan: 'FREE',
    subscriptionStatus: 'canceled',
    subscriptionCancelAtPeriodEnd: false,
  });
}

export async function creditMonthlySubscription(userId: string, plan: DbPlan): Promise<void> {
  const credits = getMonthlyCreditsForPlan(plan);
  if (credits <= 0) return;

  await addCredits(
    userId,
    credits,
    'PURCHASE',
    `${plan.toLowerCase()} subscription monthly credit allocation`
  );
}
