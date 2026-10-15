import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

let user: { id: string; email?: string; is_anonymous?: boolean } | null = null
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
}))

const createSession = vi.fn()
const createPortal = vi.fn()
const listSubs = vi.fn()
let billingEnabled = true
let active = false
let status: string | null = null
vi.mock('@/lib/billing/stripe', () => ({
  isBillingEnabled: () => billingEnabled,
  getSubscriptionSummary: async () => ({ active, status }),
  getOrCreateCustomer: async () => 'cus_123',
  getPriceId: async (key: string) => `price_for_${key}`,
  getStripe: () => ({
    checkout: { sessions: { create: (...a: unknown[]) => createSession(...a) } },
    billingPortal: { sessions: { create: (...a: unknown[]) => createPortal(...a) } },
    subscriptions: { list: (...a: unknown[]) => listSubs(...a) },
  }),
}))

import { POST } from '@/app/api/billing/checkout/route'

const USER_ID = '11111111-1111-1111-1111-111111111111'

function request(body: unknown) {
  return new NextRequest('https://flashletter.app/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  user = { id: USER_ID, email: 'a@b.co' }
  billingEnabled = true
  active = false
  status = null
  createSession.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/c/1' })
  createPortal.mockReset().mockResolvedValue({ url: 'https://billing.stripe.com/p/1' })
  listSubs.mockReset().mockResolvedValue({ data: [] })
})

describe('POST /api/billing/checkout', () => {
  it('returns 503 when Stripe is not configured', async () => {
    billingEnabled = false
    expect((await POST(request({ interval: 'month' }))).status).toBe(503)
  })

  it('requires a real account (guests get 401)', async () => {
    user = { id: USER_ID, is_anonymous: true }
    expect((await POST(request({ interval: 'month' }))).status).toBe(401)
    user = null
    expect((await POST(request({ interval: 'month' }))).status).toBe(401)
  })

  it('creates a subscription checkout for the chosen interval', async () => {
    const res = await POST(request({ interval: 'year' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/1' })
    const args = createSession.mock.calls[0][0]
    expect(args.mode).toBe('subscription')
    expect(args.customer).toBe('cus_123')
    expect(args.client_reference_id).toBe(USER_ID)
    expect(args.line_items[0].price).toBe('price_for_flashletter_pro_yearly')
    expect(args.success_url).toContain('https://flashletter.app/account?checkout=success')
  })

  it('sends existing subscribers to the billing portal instead of a second checkout', async () => {
    active = true
    const res = await POST(request({ interval: 'month' }))
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.com/p/1' })
    expect(createSession).not.toHaveBeenCalled()
  })

  // A subscription that is still billing (or still being paid for) must be
  // fixed in the portal; a second checkout would charge the user twice.
  // The first payment is still open (e.g. 3-D Secure abandoned): pay that
  // invoice rather than land in a portal that may not offer to pay it.
  it('sends an incomplete subscriber to their unpaid first invoice', async () => {
    status = 'incomplete'
    listSubs.mockResolvedValue({
      data: [{ latest_invoice: { hosted_invoice_url: 'https://invoice.stripe.com/i/1' } }],
    })
    const res = await POST(request({ interval: 'month' }))
    expect(await res.json()).toEqual({ url: 'https://invoice.stripe.com/i/1' })
    expect(listSubs.mock.calls[0][0]).toMatchObject({ customer: 'cus_123', status: 'incomplete' })
    expect(createSession).not.toHaveBeenCalled()
  })

  it.each(['past_due', 'unpaid', 'paused', 'incomplete'])(
    'sends a %s subscriber to the billing portal',
    async (s) => {
      status = s
      const res = await POST(request({ interval: 'month' }))
      expect(await res.json()).toEqual({ url: 'https://billing.stripe.com/p/1' })
      expect(createSession).not.toHaveBeenCalled()
    },
  )

  it.each(['canceled', 'incomplete_expired'])(
    'lets a %s subscriber start a new checkout',
    async (s) => {
      status = s
      const res = await POST(request({ interval: 'month' }))
      expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/1' })
      expect(createPortal).not.toHaveBeenCalled()
    },
  )

  it('rejects an unknown interval', async () => {
    expect((await POST(request({ interval: 'weekly' }))).status).toBe(400)
  })
})
