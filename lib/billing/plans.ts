/**
 * Plans and their limits. The server enforces these (see `lib/billing/limits.ts`);
 * the pricing page and upgrade prompts read the same numbers.
 */

export type PlanId = 'guest' | 'free' | 'pro'
export type BillingInterval = 'month' | 'year'

export const PLAN_LIMITS = {
  /** Anonymous visitors: one campaign to try the product. */
  guest: { campaignsPerMonth: 1, maxEmailsPerCampaign: 5, aiRewritesPerMonth: 20 },
  free: { campaignsPerMonth: 3, maxEmailsPerCampaign: 5, aiRewritesPerMonth: 30 },
  pro: {
    campaignsPerMonth: Number.POSITIVE_INFINITY,
    maxEmailsPerCampaign: 30,
    aiRewritesPerMonth: Number.POSITIVE_INFINITY,
  },
} as const satisfies Record<
  PlanId,
  { campaignsPerMonth: number; maxEmailsPerCampaign: number; aiRewritesPerMonth: number }
>

/** Stripe price lookup keys; prices are created once by `scripts/stripe-setup.mjs`. */
export const PRICE_LOOKUP_KEYS: Record<BillingInterval, string> = {
  month: 'flashletter_pro_monthly',
  year: 'flashletter_pro_yearly',
}

export const PRO_PRICE_USD: Record<BillingInterval, number> = { month: 19, year: 190 }

/** Start of the current calendar month in UTC, the window for monthly limits. */
export function currentPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}
