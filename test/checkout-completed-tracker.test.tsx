import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, cleanup } from '@testing-library/react'

const trackMock = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
  isCapturing: () => true,
}))

import { CheckoutCompletedTracker } from '@/components/billing/checkout-completed-tracker'

describe('<CheckoutCompletedTracker />', () => {
  beforeEach(() => {
    trackMock.mockReset()
    window.localStorage.clear()
  })
  afterEach(() => cleanup())

  it('fires checkout_completed once with the interval, even under StrictMode double mount', () => {
    render(
      <StrictMode>
        <CheckoutCompletedTracker
          sessionId="cs_1"
          interval="year"
        />
      </StrictMode>,
    )
    expect(trackMock).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith('checkout_completed', { interval: 'year' })
  })

  it('does not fire again for the same checkout on a reload', () => {
    render(
      <CheckoutCompletedTracker
        sessionId="cs_1"
        interval="month"
      />,
    )
    cleanup()
    render(
      <CheckoutCompletedTracker
        sessionId="cs_1"
        interval="month"
      />,
    )
    expect(trackMock).toHaveBeenCalledTimes(1)
  })

  it('a different checkout fires its own event', () => {
    render(
      <CheckoutCompletedTracker
        sessionId="cs_1"
        interval="month"
      />,
    )
    cleanup()
    render(
      <CheckoutCompletedTracker
        sessionId="cs_2"
        interval="month"
      />,
    )
    expect(trackMock).toHaveBeenCalledTimes(2)
  })

  it('still fires when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(
      <CheckoutCompletedTracker
        sessionId="cs_3"
        interval={null}
      />,
    )
    expect(trackMock).toHaveBeenCalledWith('checkout_completed', { interval: null })
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
