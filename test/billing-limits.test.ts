import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

const redisStore = new Map<string, unknown>()
const zsets = new Map<string, Map<string, number>>()
let redisAvailable = true
vi.mock('@/lib/utils/redis-client', () => ({
  getRedisClient: () =>
    redisAvailable
      ? {
          get: async (key: string) => redisStore.get(key) ?? null,
          incr: async (key: string) => {
            const next = ((redisStore.get(key) as number | undefined) ?? 0) + 1
            redisStore.set(key, next)
            return next
          },
          decr: async (key: string) => {
            const next = ((redisStore.get(key) as number | undefined) ?? 0) - 1
            redisStore.set(key, next)
            return next
          },
          set: async (key: string, value: unknown) => {
            redisStore.set(key, value)
            return 'OK'
          },
          expire: async () => 1,
          zadd: async (
            key: string,
            opts: { nx?: boolean },
            ...members: Array<{ score: number; member: string }>
          ) => {
            const set = zsets.get(key) ?? new Map<string, number>()
            zsets.set(key, set)
            let added = 0
            for (const { score, member } of members) {
              if (opts.nx && set.has(member)) continue
              if (!set.has(member)) added++
              set.set(member, score)
            }
            return added
          },
          zcard: async (key: string) => zsets.get(key)?.size ?? 0,
          zcount: async (key: string, min: number | string, max: number | string) => {
            const lo = min === '-inf' ? -Infinity : Number(min)
            const hi = max === '+inf' ? Infinity : Number(max)
            return [...(zsets.get(key)?.values() ?? [])].filter((s) => s >= lo && s <= hi).length
          },
        }
      : undefined,
}))

const summaryMock = vi.fn()
// The plan Stripe last confirmed per user (written by the real module when it reads Stripe).
const lastPlans = new Map<string, 'pro' | 'free'>()
vi.mock('@/lib/billing/stripe', () => ({
  isBillingEnabled: () => true,
  getSubscriptionSummary: (...args: unknown[]) => summaryMock(...args),
  lastKnownPlan: async (userId: string) => lastPlans.get(userId) ?? null,
}))

import {
  checkCampaignAllowed,
  checkEmailCount,
  campaignsUsedThisMonth,
  consumeAiRewrite,
  getPlan,
  refundAiRewrite,
} from '@/lib/billing/limits'
import { currentPeriodStart } from '@/lib/billing/plans'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type Row = { id: string; created_at: string }

/**
 * Supabase stub over an in-memory campaigns table: the campaign lookup by id,
 * and this month's rows up to a created_at, as rows plus an exact count.
 */
function campaignsTable(rows: Row[]) {
  return {
    from: () => {
      const filters: Record<string, string> = {}
      const chain = {
        select: () => chain,
        eq: (col: string, value: string) => {
          filters[col] = value
          return chain
        },
        gte: (_col: string, value: string) => {
          filters.gte = value
          return chain
        },
        lte: async (_col: string, value: string) => {
          const data = rows.filter((r) => r.created_at >= filters.gte && r.created_at <= value)
          return { data, count: data.length }
        },
        single: async () => ({ data: rows.find((r) => r.id === filters.id) ?? null }),
      }
      return chain
    },
  } as unknown as SupabaseClient
}

/** Campaign `c` created at `createdAt`, preceded this month by `countBefore - 1` others. */
function supabaseWith(createdAt: string | null, countBefore: number) {
  if (!createdAt) return campaignsTable([])
  const base = currentPeriodStart().getTime()
  const earlier = Array.from({ length: Math.max(countBefore - 1, 0) }, (_, i) => ({
    id: `earlier-${i}`,
    created_at: new Date(base + i).toISOString(),
  }))
  return campaignsTable([...earlier, { id: 'c', created_at: createdAt }])
}

const at = (hours: number) =>
  new Date(currentPeriodStart().getTime() + hours * 3_600_000).toISOString()

const thisMonth = new Date(currentPeriodStart().getTime() + 86_400_000).toISOString()

beforeEach(() => {
  redisStore.clear()
  zsets.clear()
  redisAvailable = true
  summaryMock.mockReset()
  lastPlans.clear()
})

describe('getPlan', () => {
  it('treats anonymous users as guests without calling Stripe', async () => {
    expect(await getPlan({ id: 'u', is_anonymous: true } as User)).toBe('guest')
    expect(summaryMock).not.toHaveBeenCalled()
  })

  it('returns pro for an active subscription and free otherwise', async () => {
    summaryMock.mockResolvedValueOnce({ active: true })
    expect(await getPlan({ id: 'u' } as User)).toBe('pro')
    summaryMock.mockResolvedValueOnce({ active: false })
    expect(await getPlan({ id: 'u' } as User)).toBe('free')
  })

  it('keeps a user last seen paying on Pro while Stripe is unreachable', async () => {
    lastPlans.set('payer', 'pro')
    summaryMock.mockRejectedValueOnce(new Error('stripe down'))
    expect(await getPlan({ id: 'payer' } as User)).toBe('pro')
  })

  it('does not hand out Pro to a free user while Stripe is unreachable', async () => {
    lastPlans.set('free-user', 'free')
    summaryMock.mockRejectedValueOnce(new Error('stripe down'))
    expect(await getPlan({ id: 'free-user' } as User)).toBe('free')
  })

  it('gives an unknown user the Free plan while Stripe is unreachable', async () => {
    summaryMock.mockRejectedValueOnce(new Error('stripe down'))
    expect(await getPlan({ id: 'never-seen' } as User)).toBe('free')
  })
})

describe('checkCampaignAllowed', () => {
  it('allows the first three campaigns of the month on Free', async () => {
    expect(await checkCampaignAllowed(supabaseWith(thisMonth, 3), 'u', 'free', 'c')).toBeNull()
  })

  it('blocks the fourth campaign of the month on Free', async () => {
    const denial = await checkCampaignAllowed(supabaseWith(thisMonth, 4), 'u', 'free', 'c')
    expect(denial?.limit).toBe('campaigns')
    expect(denial?.message).toMatch(/upgrade to pro/i)
  })

  it('asks guests to sign up after their first campaign', async () => {
    const denial = await checkCampaignAllowed(supabaseWith(thisMonth, 2), 'u', 'guest', 'c')
    expect(denial?.message).toMatch(/free account/i)
  })

  // The id is optional in the request schema; leaving it out used to skip the
  // count, so a Free user past 3 campaigns could keep generating via the API.
  it('refuses a generation with no campaign on limited plans', async () => {
    expect(
      await checkCampaignAllowed(supabaseWith(thisMonth, 99), 'u', 'free', undefined),
    ).not.toBeNull()
    expect(
      await checkCampaignAllowed(supabaseWith(thisMonth, 99), 'u', 'guest', undefined),
    ).not.toBeNull()
    expect(
      await checkCampaignAllowed(supabaseWith(thisMonth, 99), 'u', 'pro', undefined),
    ).toBeNull()
  })

  // Deleting a campaign used to hand back its slot, because only the rows
  // still in the table were counted.
  it('does not give a slot back when a counted campaign is deleted', async () => {
    const rows = [
      { id: 'c1', created_at: at(1) },
      { id: 'c2', created_at: at(2) },
      { id: 'c3', created_at: at(3) },
    ]
    for (const r of rows) {
      expect(await checkCampaignAllowed(campaignsTable(rows), 'u', 'free', r.id)).toBeNull()
    }

    const afterDelete = [...rows.slice(1), { id: 'c4', created_at: at(4) }]
    const denial = await checkCampaignAllowed(campaignsTable(afterDelete), 'u', 'free', 'c4')
    expect(denial?.limit).toBe('campaigns')
    // Regenerating a campaign that was already counted stays allowed.
    expect(await checkCampaignAllowed(campaignsTable(afterDelete), 'u', 'free', 'c3')).toBeNull()
  })

  it('counts campaigns generated out of order only once each', async () => {
    const rows = [1, 2, 3, 4].map((h) => ({ id: `c${h}`, created_at: at(h) }))
    expect(await checkCampaignAllowed(campaignsTable(rows), 'u', 'free', 'c4')).not.toBeNull()
    expect(await checkCampaignAllowed(campaignsTable(rows), 'u', 'free', 'c3')).toBeNull()
  })

  it('falls back to counting rows when Redis is not configured', async () => {
    redisAvailable = false
    expect(await checkCampaignAllowed(supabaseWith(thisMonth, 3), 'u', 'free', 'c')).toBeNull()
    expect(await checkCampaignAllowed(supabaseWith(thisMonth, 4), 'u', 'free', 'c')).not.toBeNull()
  })

  it('never limits Pro or campaigns from earlier months', async () => {
    expect(await checkCampaignAllowed(supabaseWith(thisMonth, 99), 'u', 'pro', 'c')).toBeNull()
    expect(
      await checkCampaignAllowed(supabaseWith('2020-01-01T00:00:00Z', 99), 'u', 'free', 'c'),
    ).toBeNull()
  })
})

describe('checkEmailCount', () => {
  it('caps Free at 5 emails and lets Pro go to 30', () => {
    expect(checkEmailCount('free', 5)).toBeNull()
    expect(checkEmailCount('free', 6)?.limit).toBe('emails')
    expect(checkEmailCount('pro', 30)).toBeNull()
  })
})

describe('consumeAiRewrite', () => {
  it('allows 30 rewrites a month on Free, then refuses', async () => {
    for (let i = 0; i < 30; i++) expect(await consumeAiRewrite('u', 'free')).toBeNull()
    expect((await consumeAiRewrite('u', 'free'))?.limit).toBe('ai_rewrites')
  })

  // A refused request never ran, so it must not count; otherwise a single
  // refund after a few refusals can't bring the user back under the limit.
  it('does not count a refused rewrite', async () => {
    for (let i = 0; i < 30; i++) await consumeAiRewrite('u', 'free')
    for (let i = 0; i < 5; i++) expect(await consumeAiRewrite('u', 'free')).not.toBeNull()
    await refundAiRewrite('u', 'free')
    expect(await consumeAiRewrite('u', 'free')).toBeNull()
  })

  it('never counts Pro', async () => {
    for (let i = 0; i < 40; i++) expect(await consumeAiRewrite('p', 'pro')).toBeNull()
  })

  it('gives a failed rewrite back, never going below zero', async () => {
    for (let i = 0; i < 30; i++) await consumeAiRewrite('u', 'free')
    await refundAiRewrite('u', 'free')
    expect(await consumeAiRewrite('u', 'free')).toBeNull()
    expect((await consumeAiRewrite('u', 'free'))?.limit).toBe('ai_rewrites')

    await refundAiRewrite('fresh', 'free')
    expect([...redisStore.values()].every((v) => typeof v !== 'number' || v >= 0)).toBe(true)
    for (let i = 0; i < 30; i++) expect(await consumeAiRewrite('fresh', 'free')).toBeNull()
    expect((await consumeAiRewrite('fresh', 'free'))?.limit).toBe('ai_rewrites')
  })

  it('does not touch Redis for Pro refunds', async () => {
    await refundAiRewrite('p', 'pro')
    expect(redisStore.size).toBe(0)
  })
})

describe('campaignsUsedThisMonth', () => {
  it('still counts a campaign that was deleted after it was counted', async () => {
    const rows = [
      { id: 'a', created_at: at(1) },
      { id: 'b', created_at: at(2) },
    ]
    await checkCampaignAllowed(campaignsTable(rows), 'u', 'free', 'b')
    // 'a' is deleted: one row left, but both were counted.
    expect(await campaignsUsedThisMonth('u', 1)).toBe(2)
  })

  it('uses the row count when Redis has fewer or is missing', async () => {
    expect(await campaignsUsedThisMonth('u', 3)).toBe(3)
    redisAvailable = false
    expect(await campaignsUsedThisMonth('u', 2)).toBe(2)
  })
})
