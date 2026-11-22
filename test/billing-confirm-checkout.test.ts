// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const retrieveMock = vi.fn()
const clearCacheMock = vi.fn()
const billingEnabledMock = vi.fn()
vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: (id: string) => retrieveMock(id) } } }),
  clearSubscriptionCache: (userId: string) => clearCacheMock(userId),
  isBillingEnabled: () => billingEnabledMock(),
}))

import { confirmCheckout } from '@/lib/billing/confirm-checkout'

const USER = 'user-1'

function session(overrides: Record<string, unknown>) {
  return {
    client_reference_id: USER,
    status: 'complete',
    payment_status: 'paid',
    ...overrides,
  }
}

describe('confirmCheckout', () => {
  beforeEach(() => {
    retrieveMock.mockReset()
    clearCacheMock.mockReset().mockResolvedValue(undefined)
    billingEnabledMock.mockReset().mockReturnValue(true)
  })

  it('paid: complete and paid', async () => {
    retrieveMock.mockResolvedValue(session({}))
    expect(await confirmCheckout(USER, 'cs_1')).toBe('paid')
    expect(retrieveMock).toHaveBeenCalledWith('cs_1')
    expect(clearCacheMock).toHaveBeenCalledWith(USER)
  })

  it('paid: complete with no payment required (100% coupon)', async () => {
    retrieveMock.mockResolvedValue(session({ payment_status: 'no_payment_required' }))
    expect(await confirmCheckout(USER, 'cs_1')).toBe('paid')
  })

  it('processing: complete but the payment has not cleared yet', async () => {
    retrieveMock.mockResolvedValue(session({ payment_status: 'unpaid' }))
    expect(await confirmCheckout(USER, 'cs_1')).toBe('processing')
  })

  it('null: session still open', async () => {
    retrieveMock.mockResolvedValue(session({ status: 'open', payment_status: 'unpaid' }))
    expect(await confirmCheckout(USER, 'cs_1')).toBeNull()
  })

  it('null: session belongs to someone else, even if paid', async () => {
    retrieveMock.mockResolvedValue(session({ client_reference_id: 'other-user' }))
    expect(await confirmCheckout(USER, 'cs_1')).toBeNull()
    expect(clearCacheMock).not.toHaveBeenCalled()
  })

  it('null: no session id', async () => {
    expect(await confirmCheckout(USER, undefined)).toBeNull()
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('null: billing disabled', async () => {
    billingEnabledMock.mockReturnValue(false)
    expect(await confirmCheckout(USER, 'cs_1')).toBeNull()
    expect(retrieveMock).not.toHaveBeenCalled()
  })

  it('null: Stripe lookup throws', async () => {
    retrieveMock.mockRejectedValue(new Error('No such checkout.session'))
    expect(await confirmCheckout(USER, 'cs_1')).toBeNull()
  })
})
