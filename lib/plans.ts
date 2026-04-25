export type DbPlan = 'FREE' | 'PRO' | 'BUSINESS';
export type PlanSlug = 'free' | 'pro' | 'business';
export type BillingInterval = 'month' | 'year';

export const FREE_DAILY_CREDITS = 30;
export const FREE_DAILY_ACTION_LIMIT = 15;
export const FREE_DAILY_UPLOAD_LIMIT = 3;
export const FREE_MAX_IMAGES_PER_REQUEST = 2;

export const FREE_ALLOWED_MODELS = [
  'gpt-image-2',
  'recraftv4_vector',
  'recraftv3_vector',
] as const;

export const MONTHLY_PLAN_CREDITS: Record<DbPlan, number> = {
  FREE: 0,
  PRO: 5000,
  BUSINESS: 10000,
};

export type PublicPlanCard = {
  plan: DbPlan;
  slug: PlanSlug;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  creditsLabel: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
};

export const PUBLIC_PLAN_CARDS: ReadonlyArray<PublicPlanCard> = [
  {
    plan: 'FREE',
    slug: 'free',
    name: 'Free',
    description: 'Try core tools with daily limits.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    creditsLabel: `${FREE_DAILY_CREDITS} daily credits`,
    features: [
      `${FREE_DAILY_ACTION_LIMIT} AI actions per day`,
      `${FREE_DAILY_UPLOAD_LIMIT} uploads per day`,
      'GPT Image 2 + Recraft V4/V3 Vector models',
      'Community support',
    ],
    ctaLabel: 'Start free',
  },
  {
    plan: 'PRO',
    slug: 'pro',
    name: 'Pro',
    description: 'For creators shipping work every day.',
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    creditsLabel: `${MONTHLY_PLAN_CREDITS.PRO.toLocaleString()} monthly credits`,
    features: [
      'All generation and editing models',
      'Vectorize and Creative Upscale',
      'Private generations + commercial rights',
      'Priority queue',
    ],
    ctaLabel: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    plan: 'BUSINESS',
    slug: 'business',
    name: 'Business',
    description: 'High volume credits and team workflows.',
    monthlyPrice: 39.99,
    yearlyPrice: 31.99,
    creditsLabel: `${MONTHLY_PLAN_CREDITS.BUSINESS.toLocaleString()} monthly credits`,
    features: [
      'Everything in Pro',
      'Highest monthly credit allocation',
      'Priority support',
      'Billing portal and invoice history',
    ],
    ctaLabel: 'Upgrade to Business',
  },
] as const;

const PLAN_TO_SLUG: Record<DbPlan, PlanSlug> = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
};

const SLUG_TO_PLAN: Record<PlanSlug, DbPlan> = {
  free: 'FREE',
  pro: 'PRO',
  business: 'BUSINESS',
};

export function normalizeDbPlan(value: string | null | undefined): DbPlan {
  const normalized = (value || 'FREE').toUpperCase();
  if (normalized === 'PRO' || normalized === 'BUSINESS') return normalized;
  return 'FREE';
}

export function planToSlug(plan: string | null | undefined): PlanSlug {
  return PLAN_TO_SLUG[normalizeDbPlan(plan)];
}

export function slugToPlan(slug: string | null | undefined): DbPlan {
  const normalized = (slug || 'free').toLowerCase();
  if (normalized === 'pro') return 'PRO';
  if (normalized === 'business') return 'BUSINESS';
  return 'FREE';
}

export function isPremiumPlan(plan: string | null | undefined): boolean {
  const normalized = normalizeDbPlan(plan);
  return normalized === 'PRO' || normalized === 'BUSINESS';
}

export function getPublicPlanCard(plan: string | null | undefined): PublicPlanCard {
  const normalized = normalizeDbPlan(plan);
  const card = PUBLIC_PLAN_CARDS.find((entry) => entry.plan === normalized);
  return card || PUBLIC_PLAN_CARDS[0];
}
