import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'
import { ResumeCheckout } from '@/components/billing/resume-checkout'

const fetchMock = vi.fn()
let searchAtFetch: string | null = null

beforeEach(() => {
  window.history.replaceState(null, '', '/account?upgrade=month&ref=pricing')
  searchAtFetch = null
  fetchMock.mockReset().mockImplementation(async () => {
    searchAtFetch = window.location.search
    // Fails on purpose, so jsdom is never asked to navigate away.
    return new Response(JSON.stringify({ error: 'stop here' }), { status: 500 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ResumeCheckout', () => {
  // Pressing Back on Stripe used to land on /account?upgrade=… again and
  // bounce the user straight back to checkout.
  it('drops ?upgrade= from the URL before starting checkout, keeping other params', async () => {
    render(<ResumeCheckout interval="month" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(searchAtFetch).toBe('?ref=pricing')
    expect(window.location.pathname).toBe('/account')
  })

  it('starts checkout only once, even when mounted again', async () => {
    const first = render(<ResumeCheckout interval="month" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    first.unmount()
    render(<ResumeCheckout interval="month" />)
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('stops showing the redirect spinner when the page comes back from the back/forward cache', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    render(<ResumeCheckout interval="month" />)
    expect(screen.getByText(/taking you to secure checkout/i)).toBeTruthy()
    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent
      Object.defineProperty(event, 'persisted', { value: true })
      window.dispatchEvent(event)
    })
    expect(screen.queryByText(/taking you to secure checkout/i)).toBeNull()
  })
})
