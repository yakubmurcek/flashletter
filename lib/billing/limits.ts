import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getRedis } from '@/lib/utils/rate-limit'
import { PLAN_LIMITS, currentPeriodStart, type PlanId } from './plans'
import { getSubscriptionSummary, isBillingEnabled } from './stripe'

export async function getPlan(user: User): Promise<PlanId> {
  if (user.is_anonymous) return 'guest'
  if (!isBillingEnabled()) return 'free'
  try {
    const summary = await getSubscriptionSummary(user.id)
    return summary.active ? 'pro' : 'free'
  } catch (error) {
    // A Stripe outage must not lock paying users out of their work.
    Sentry.captureException(error, { tags: { area: 'billing' } })
    return 'pro'
  }
}

export type LimitDenial = {
  error: 'limit_reached'
  limit: 'campaigns' | 'emails' | 'ai_rewrites'
  plan: PlanId
  message: string
}

/**
 * A campaign may generate when it is among the first N campaigns the user
 * created this month, so regenerating an allowed campaign never counts twice.
 */
export async function checkCampaignAllowed(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId,
  campaignId: string | undefined,
): Promise<LimitDenial | null> {
  const max = PLAN_LIMITS[plan].campaignsPerMonth
  if (!Number.isFinite(max) || !campaignId) return null

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('created_at')
    .eq('id', campaignId)
    .single()
  if (!campaign?.created_at) return null

  const periodStart = currentPeriodStart().toISOString()
  // Created before this month: an older campaign, already counted back then.
  if (campaign.created_at < periodStart) return null

  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', periodStart)
    .lte('created_at', campaign.created_at)

  if ((count ?? 0) <= max) return null
  return {
    error: 'limit_reached',
    limit: 'campaigns',
    plan,
    message:
      plan === 'guest'
        ? 'Create a free account to generate more campaigns.'
        : `The Free plan includes ${max} campaigns a month. Upgrade to Pro for unlimited campaigns.`,
  }
}

export function checkEmailCount(plan: PlanId, days: number): LimitDenial | null {
  const max = PLAN_LIMITS[plan].maxEmailsPerCampaign
  if (days <= max) return null
  return {
    error: 'limit_reached',
    limit: 'emails',
    plan,
    message: `Sequences on your plan can have up to ${max} emails. Upgrade to Pro for up to ${PLAN_LIMITS.pro.maxEmailsPerCampaign}.`,
  }
}

/** Counts one AI rewrite against the monthly allowance; null when allowed. */
export async function consumeAiRewrite(userId: string, plan: PlanId): Promise<LimitDenial | null> {
  const max = PLAN_LIMITS[plan].aiRewritesPerMonth
  if (!Number.isFinite(max)) return null
  const redis = getRedis()
  if (!redis) return null

  const period = currentPeriodStart().toISOString().slice(0, 7)
  const key = `billing:rewrites:${userId}:${period}`
  const used = await redis.incr(key).catch(() => 0)
  if (used === 1) await redis.expire(key, 60 * 60 * 24 * 40).catch(() => undefined)
  if (used <= max) return null
  return {
    error: 'limit_reached',
    limit: 'ai_rewrites',
    plan,
    message: `You've used this month's ${max} AI rewrites. Upgrade to Pro for unlimited rewrites.`,
  }
}
