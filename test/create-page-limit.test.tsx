import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/campaign-context', () => ({
  useCampaign: () => ({
    setLandingPageData: vi.fn(),
    createNewCampaign: vi.fn(),
    isLoading: false,
    clearAll: vi.fn(),
  }),
}))

const limitState = { isAnonymous: true, canCreate: false }
vi.mock('@/lib/hooks/use-anonymous-limit', () => ({
  useAnonymousLimit: () => ({
    isLoading: false,
    isAnonymous: limitState.isAnonymous,
    canCreate: limitState.canCreate,
    campaignCount: 1,
    campaignLimit: 3,
  }),
}))

const trackMock = vi.fn()
vi.mock('@/lib/analytics', () => ({ track: (...args: unknown[]) => trackMock(...args) }))
vi.mock('@/components/layouts/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/billing/upgrade-button', () => ({ UpgradeButton: () => null }))
vi.mock('@/components/auth/upgrade-prompt', () => ({ UpgradePrompt: () => null }))
vi.mock('@/components/campaign/scrape-progress-overlay', () => ({
  ScrapeProgressOverlay: () => null,
}))

import CreatePage from '@/app/create/page'

describe('CreatePage limit_reached', () => {
  beforeEach(() => trackMock.mockReset())
  afterEach(cleanup)

  it('logs limit_reached when a guest sees the sign-up prompt', () => {
    Object.assign(limitState, { isAnonymous: true, canCreate: false })
    render(<CreatePage />)
    expect(trackMock).toHaveBeenCalledWith('limit_reached', {
      plan: 'guest',
      limit: 'campaigns',
      surface: 'create',
    })
  })

  it('logs limit_reached when a Free user sees the used-up card', () => {
    Object.assign(limitState, { isAnonymous: false, canCreate: false })
    render(<CreatePage />)
    expect(trackMock).toHaveBeenCalledWith('limit_reached', {
      plan: 'free',
      limit: 'campaigns',
      surface: 'create',
    })
  })

  it('logs nothing while campaigns are left', () => {
    Object.assign(limitState, { isAnonymous: false, canCreate: true })
    render(<CreatePage />)
    expect(trackMock).not.toHaveBeenCalledWith('limit_reached', expect.anything())
  })
})
