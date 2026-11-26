import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'real@user.com', is_anonymous: false } },
      }),
    },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        gte: async () => ({ count: 0 }),
      }
      return q
    },
  }),
}))

vi.mock('@/components/layouts/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/auth/sign-out-button', () => ({ SignOutButton: () => null }))
vi.mock('@/components/billing/upgrade-button', () => ({
  UpgradeButton: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}))
vi.mock('@/components/billing/portal-button', () => ({ PortalButton: () => null }))
vi.mock('@/components/billing/resume-checkout', () => ({ ResumeCheckout: () => null }))
vi.mock('@/lib/billing/limits', () => ({ campaignsUsedThisMonth: async () => 0 }))

const confirmCheckoutMock = vi.fn()
vi.mock('@/lib/billing/confirm-checkout', () => ({
  confirmCheckout: (...args: unknown[]) => confirmCheckoutMock(...args),
}))

const summaryMock = vi.fn()
vi.mock('@/lib/billing/stripe', () => ({
  getSubscriptionSummary: (...args: unknown[]) => summaryMock(...args),
  isBillingEnabled: () => true,
}))

const trackerMock = vi.fn()
vi.mock('@/components/billing/checkout-completed-tracker', () => ({
  CheckoutCompletedTracker: (props: unknown) => {
    trackerMock(props)
    return null
  },
}))

import AccountPage from '@/app/account/page'

const FREE = {
  active: false,
  status: null,
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  customerId: null,
}

async function renderPage(params: Record<string, string>) {
  const ui = await AccountPage({ searchParams: Promise.resolve(params) })
  return render(ui)
}

const SUCCESS = { checkout: 'success', session_id: 'cs_1' }

describe('Account page after Stripe Checkout', () => {
  beforeEach(() => {
    confirmCheckoutMock.mockReset()
    summaryMock.mockReset().mockResolvedValue(FREE)
    trackerMock.mockReset()
  })
  afterEach(() => cleanup())

  it('paid: shows Welcome to Pro and tracks checkout_completed with the interval', async () => {
    confirmCheckoutMock.mockResolvedValue('paid')
    summaryMock.mockResolvedValue({ ...FREE, active: true, status: 'active', interval: 'year' })

    await renderPage(SUCCESS)

    expect(confirmCheckoutMock).toHaveBeenCalledWith('user-1', 'cs_1')
    expect(screen.getByText('Welcome to Pro.')).toBeTruthy()
    expect(screen.queryByText(/payment is processing/i)).toBeNull()
    expect(trackerMock).toHaveBeenCalledTimes(1)
    expect(trackerMock).toHaveBeenCalledWith({ sessionId: 'cs_1', interval: 'year' })
    // Plan is re-read fresh right after a confirmed payment.
    expect(summaryMock.mock.calls[0]?.[1]).toEqual({ fresh: true })
  })

  it('processing: no Welcome to Pro, a processing note instead, no analytics event', async () => {
    confirmCheckoutMock.mockResolvedValue('processing')

    await renderPage(SUCCESS)

    expect(screen.queryByText('Welcome to Pro.')).toBeNull()
    expect(
      screen.getByText('Your payment is processing. Pro turns on as soon as it clears.'),
    ).toBeTruthy()
    expect(trackerMock).not.toHaveBeenCalled()
  })

  it('unconfirmed session: neither banner nor event', async () => {
    confirmCheckoutMock.mockResolvedValue(null)

    await renderPage(SUCCESS)

    expect(screen.queryByText('Welcome to Pro.')).toBeNull()
    expect(screen.queryByText(/payment is processing/i)).toBeNull()
    expect(trackerMock).not.toHaveBeenCalled()
  })

  it('plain visit without checkout=success never looks up a session', async () => {
    await renderPage({})

    expect(confirmCheckoutMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Welcome to Pro.')).toBeNull()
    expect(trackerMock).not.toHaveBeenCalled()
  })
})
