import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

const redisStore = new Map<string, number>()
vi.mock('@/lib/utils/rate-limit', () => ({
  getRedis: () => ({
    incr: async (key: string) => {
      const next = (redisStore.get(key) ?? 0) + 1
      redisStore.set(key, next)
      return next
    },
    expire: async () => 1,
  }),
}))

const summaryMock = vi.fn()
vi.mock('@/lib/billing/stripe', () => ({
  isBillingEnabled: () => true,
  getSubscriptionSummary: (...args: unknown[]) => summaryMock(...args),
}))

import {
  checkCampaignAllowed,
  checkEmailCount,
  consumeAiRewrite,
  getPlan,
} from '@/lib/billing/limits'
import { currentPeriodStart } from '@/lib/billing/plans'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/** Minimal Supabase stub: campaign lookup + a count of this month's campaigns. */
function supabaseWith(createdAt: string | null, countBefore: number) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    lte: async () => ({ count: countBefore }),
    single: async () => ({ data: createdAt ? { created_at: createdAt } : null }),
  }
  return { from: () => chain } as unknown as SupabaseClient
}

const thisMonth = new Date(currentPeriodStart().getTime() + 86_400_000).toISOString()

beforeEach(() => {
  redisStore.clear()
  summaryMock.mockReset()
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

  it('does not lock users out when Stripe is unreachable', async () => {
    summaryMock.mockRejectedValueOnce(new Error('stripe down'))
    expect(await getPlan({ id: 'u' } as User)).toBe('pro')
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

  it('never counts Pro', async () => {
    for (let i = 0; i < 40; i++) expect(await consumeAiRewrite('p', 'pro')).toBeNull()
  })
})
