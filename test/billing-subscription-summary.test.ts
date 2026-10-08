// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const list = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({ getRedis: () => undefined }))
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
})
