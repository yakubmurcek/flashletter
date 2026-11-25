import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getRedis } from '@/lib/utils/rate-limit'
import { PLAN_LIMITS, currentPeriodStart, type PlanId } from './plans'
import type { LimitKind } from './errors'
import { getSubscriptionSummary, isBillingEnabled } from './stripe'

// The plan Stripe last confirmed, kept longer than any billing period, for outages.
const lastPlanKey = (userId: string) => `flashletter:billing:last-plan:${userId}`
const LAST_PLAN_TTL_SECONDS = 40 * 24 * 60 * 60

export async function getPlan(user: User): Promise<PlanId> {
  if (user.is_anonymous) return 'guest'
  if (!isBillingEnabled()) return 'free'
  const redis = getRedis()
  try {
    const summary = await getSubscriptionSummary(user)
    const plan: PlanId = summary.active ? 'pro' : 'free'
    await redis
      ?.set(lastPlanKey(user.id), plan, { ex: LAST_PLAN_TTL_SECONDS })
      .catch(() => undefined)
    return plan
  } catch (error) {
    // Stripe is unreachable. A user last seen paying keeps Pro, so payers are not
    // locked out; everyone else gets Free, so an outage never hands out Pro.
    Sentry.captureException(error, { tags: { area: 'billing' } })
    const last = await redis?.get<PlanId>(lastPlanKey(user.id)).catch(() => null)
    return last === 'pro' ? 'pro' : 'free'
  }
}

export type LimitDenial = {
  error: 'limit_reached'
  limit: LimitKind
  plan: PlanId
  message: string
}

/**
 * A campaign may generate when it is among the first N campaigns the user
 * created this month (deleted ones included), so regenerating an allowed
 * campaign never counts twice and deleting one never frees a slot.
 */
export async function checkCampaignAllowed(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId,
  campaignId: string | undefined,
): Promise<LimitDenial | null> {
  const max = PLAN_LIMITS[plan].campaignsPerMonth
  if (!Number.isFinite(max)) return null
  // Limited plans are counted by campaign row, so a generation with no
  // campaign would never be counted: refuse it rather than let any direct
  // API call skip the monthly limit. The app always saves the campaign first.
  if (!campaignId) {
    return {
      error: 'limit_reached',
      limit: 'campaigns',
      plan,
      message: 'Paste your landing page URL to start a campaign, then generate its emails.',
    }
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('created_at')
    .eq('id', campaignId)
    .single()
  if (!campaign?.created_at) return null

  const periodStart = currentPeriodStart().toISOString()
  // Created before this month: an older campaign, already counted back then.
  if (campaign.created_at < periodStart) return null

  const { data: rows, count: rowCount } = await supabase
    .from('campaigns')
    .select('id, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', periodStart)
    .lte('created_at', campaign.created_at)

  const count =
    (await countCampaignsSeen(userId, campaignId, campaign.created_at, rows ?? [])) ?? rowCount ?? 0
  if (count <= max) return null
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

function campaignSetKey(userId: string) {
  const period = currentPeriodStart().toISOString().slice(0, 7)
  return `flashletter:billing:campaigns:${userId}:${period}`
}

/** Monthly counters live a little past the end of their month. */
const MONTHLY_KEY_TTL_SECONDS = 60 * 60 * 24 * 40

/**
 * How many campaigns this month were created no later than this one, counting
 * deleted campaigns too: every campaign checked here stays in a Redis set for
 * the month, so deleting one never frees a slot. The set is topped up from the
 * rows still in the table each time, so campaigns from before this set existed
 * (or generated out of order) are counted as well. Null when Redis is missing
 * or fails; the caller then counts the remaining rows as before.
 */
async function countCampaignsSeen(
  userId: string,
  campaignId: string,
  createdAt: string,
  rows: { id: string; created_at: string }[],
): Promise<number | null> {
  const redis = getRedis()
  const score = Date.parse(createdAt)
  if (!redis || Number.isNaN(score)) return null

  const key = campaignSetKey(userId)
  const earlier = rows
    .filter((r) => r.id !== campaignId)
    .map((r) => ({ score: Date.parse(r.created_at), member: r.id }))
    .filter((m) => !Number.isNaN(m.score))
  try {
    await redis.zadd(key, { nx: true }, { score, member: campaignId }, ...earlier)
    await redis.expire(key, MONTHLY_KEY_TTL_SECONDS)
    return await redis.zcount(key, '-inf', score)
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing' } })
    return null
  }
}

/**
 * Campaigns used this month for display, given the rows still in the table:
 * the Redis set also remembers deleted ones, so take whichever is higher.
 */
export async function campaignsUsedThisMonth(userId: string, rowCount: number): Promise<number> {
  const redis = getRedis()
  if (!redis) return rowCount
  try {
    return Math.max(rowCount, await redis.zcard(campaignSetKey(userId)))
  } catch {
    return rowCount
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

function rewriteKey(userId: string) {
  const period = currentPeriodStart().toISOString().slice(0, 7)
  return `flashletter:billing:rewrites:${userId}:${period}`
}

/** Counts one AI rewrite against the monthly allowance; null when allowed. */
export async function consumeAiRewrite(userId: string, plan: PlanId): Promise<LimitDenial | null> {
  const max = PLAN_LIMITS[plan].aiRewritesPerMonth
  if (!Number.isFinite(max)) return null
  const redis = getRedis()
  if (!redis) return null

  const key = rewriteKey(userId)
  const used = await redis.incr(key).catch(() => 0)
  if (used === 1) await redis.expire(key, MONTHLY_KEY_TTL_SECONDS).catch(() => undefined)
  if (used <= max) return null
  // Refused, so it never ran: take it back off the count.
  await redis.decr(key).catch(() => undefined)
  return {
    error: 'limit_reached',
    limit: 'ai_rewrites',
    plan,
    message: `You've used this month's ${max} AI rewrites. Upgrade to Pro for unlimited rewrites.`,
  }
}

/** Gives back a rewrite counted by consumeAiRewrite when the AI call failed. */
export async function refundAiRewrite(userId: string, plan: PlanId): Promise<void> {
  if (!Number.isFinite(PLAN_LIMITS[plan].aiRewritesPerMonth)) return
  const redis = getRedis()
  if (!redis) return

  const key = rewriteKey(userId)
  try {
    const used = await redis.decr(key)
    // A refund after the key expired (or never existed) must not bank credit.
    if (used < 0) await redis.set(key, 0, { ex: MONTHLY_KEY_TTL_SECONDS })
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'billing' } })
  }
}
