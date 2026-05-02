import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'

const trackMock = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}))

const replaceMock = vi.fn()
let searchParamsValue = new URLSearchParams()
let pathnameValue = '/campaigns'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameValue,
  useSearchParams: () => searchParamsValue,
}))

import { SignupTracker } from '@/components/analytics/signup-tracker'

beforeEach(() => {
  trackMock.mockReset()
  replaceMock.mockReset()
  searchParamsValue = new URLSearchParams()
  pathnameValue = '/campaigns'
})

afterEach(() => {
  cleanup()
})

describe('<SignupTracker />', () => {
  it('does nothing without ?signedUp=1', async () => {
    render(<SignupTracker />)
    // Give effects a tick to run.
    await new Promise((r) => setTimeout(r, 0))
    expect(trackMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('fires signup_completed once and strips the param', async () => {
    searchParamsValue = new URLSearchParams('signedUp=1')
    render(<SignupTracker />)

    await waitFor(() => expect(trackMock).toHaveBeenCalledWith('signup_completed'))
    expect(replaceMock).toHaveBeenCalledWith('/campaigns', { scroll: false })
  })

  it('preserves other query params when stripping signedUp', async () => {
    searchParamsValue = new URLSearchParams('signedUp=1&ref=hn')
    render(<SignupTracker />)

    await waitFor(() => expect(trackMock).toHaveBeenCalled())
    expect(replaceMock).toHaveBeenCalledWith('/campaigns?ref=hn', { scroll: false })
  })

  it('does not double-fire on a re-render with the same params', async () => {
    searchParamsValue = new URLSearchParams('signedUp=1')
    const { rerender } = render(<SignupTracker />)
    await waitFor(() => expect(trackMock).toHaveBeenCalledTimes(1))

    rerender(<SignupTracker />)
    await new Promise((r) => setTimeout(r, 0))
    expect(trackMock).toHaveBeenCalledTimes(1)
  })
})
