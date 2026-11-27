// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const list = vi.fn()
const redisStore = new Map<string, unknown>()
vi.mock('@/lib/utils/redis-client', () => ({
  getRedisClient: () => ({
    get: async (key: string) => redisStore.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      redisStore.set(key, value)
      return 'OK'
    },
  }),
}))
vi.mock('stripe', () => ({
  default: class {
    customers = {
      list: vi.fn().mockResolvedValue({ data: [{ id: 'cus_1', metadata: { user_id: USER } }] }),
      search: vi.fn(),
    }
    subscriptions = { list }
  },
}))

const USER = '11111111-1111-4111-8111-111111111111'

function sub(overrides: Record<string, unknown>) {
  return {
    status: 'active',
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 2000, price: { recurring: { interval: 'month' } } }] },
    ...overrides,
  }
}

describe('getSubscriptionSummary', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    list.mockReset()
    redisStore.clear()
  })

  it('reports a renewal when nothing is scheduled', async () => {
    list.mockResolvedValue({ data: [sub({})] })
    const { getSubscriptionSummary } = await import('@/lib/billing/stripe')
    const s = await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(s.cancelAtPeriodEnd).toBe(false)
    expect(s.currentPeriodEnd).toBe(2000)
  })

  it('treats a portal cancellation (cancel_at) as ending, on that date', async () => {
    list.mockResolvedValue({ data: [sub({ cancel_at: 1500 })] })
    const { getSubscriptionSummary } = await import('@/lib/billing/stripe')
    const s = await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(s.active).toBe(true)
    expect(s.cancelAtPeriodEnd).toBe(true)
    expect(s.currentPeriodEnd).toBe(1500)
  })

  it('still honours cancel_at_period_end', async () => {
    list.mockResolvedValue({ data: [sub({ cancel_at_period_end: true })] })
    const { getSubscriptionSummary } = await import('@/lib/billing/stripe')
    const s = await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(s.cancelAtPeriodEnd).toBe(true)
  })

  // Stripe lists newest first. A newer canceled subscription must not hide
  // an unpaid one, or checkout would sell the user a second subscription.
  it('reports a past_due subscription over a newer canceled one', async () => {
    list.mockResolvedValue({ data: [sub({ status: 'canceled' }), sub({ status: 'past_due' })] })
    const { getSubscriptionSummary } = await import('@/lib/billing/stripe')
    const s = await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(s.status).toBe('past_due')
  })

  // The fallback for a Stripe outage (getPlan) reads the plan Stripe last confirmed.
  it('remembers the plan it read, for a later Stripe outage', async () => {
    const { getSubscriptionSummary, lastKnownPlan } = await import('@/lib/billing/stripe')
    expect(await lastKnownPlan(USER)).toBeNull()
    list.mockResolvedValue({ data: [sub({})] })
    await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(await lastKnownPlan(USER)).toBe('pro')
    list.mockResolvedValue({ data: [sub({ status: 'canceled' })] })
    await getSubscriptionSummary({ id: USER, email: 'a@b.c' }, { fresh: true })
    expect(await lastKnownPlan(USER)).toBe('free')
  })
})
