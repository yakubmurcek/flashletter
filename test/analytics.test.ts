import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const captureMock = vi.fn()
const identifyMock = vi.fn()
const initMock = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => initMock(...args),
    capture: (...args: unknown[]) => captureMock(...args),
    identify: (...args: unknown[]) => identifyMock(...args),
  },
}))

import {
  initPostHog,
  track,
  identify,
  _resetAnalyticsForTests,
} from '@/lib/analytics'

beforeEach(() => {
  initMock.mockReset()
  captureMock.mockReset()
  identifyMock.mockReset()
  _resetAnalyticsForTests()
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST
})

afterEach(() => {
  _resetAnalyticsForTests()
})

describe('lib/analytics', () => {
  describe('initPostHog', () => {
    it('does nothing when NEXT_PUBLIC_POSTHOG_KEY is unset', () => {
      initPostHog()
      expect(initMock).not.toHaveBeenCalled()
    })

    it('initializes posthog with the configured key and default host', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      expect(initMock).toHaveBeenCalledTimes(1)
      const [key, options] = initMock.mock.calls[0]
      expect(key).toBe('phc_test')
      expect(options.api_host).toBe('https://us.i.posthog.com')
    })

    it('respects NEXT_PUBLIC_POSTHOG_HOST when provided', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com'
      initPostHog()
      expect(initMock.mock.calls[0][1].api_host).toBe('https://eu.i.posthog.com')
    })

    it('is idempotent — calling twice still only initializes once', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      initPostHog()
      expect(initMock).toHaveBeenCalledTimes(1)
    })

    it('opts out of posthog exception capture so it does not duplicate Sentry', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      expect(initMock.mock.calls[0][1].capture_exceptions).toBe(false)
    })
  })

  describe('track', () => {
    it('no-ops before initPostHog so call sites can fire safely', () => {
      track('url_pasted', { domain: 'example.com' })
      expect(captureMock).not.toHaveBeenCalled()
    })

    it('passes event name and props through after init', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      track('url_pasted', { domain: 'example.com' })
      expect(captureMock).toHaveBeenCalledWith('url_pasted', { domain: 'example.com' })
    })

    it('continues to no-op if init was attempted without a key', () => {
      // env unset, init() runs but does nothing → track() still must no-op.
      initPostHog()
      track('url_pasted')
      expect(captureMock).not.toHaveBeenCalled()
    })
  })

  describe('identify', () => {
    it('no-ops before init', () => {
      identify('user-123')
      expect(identifyMock).not.toHaveBeenCalled()
    })

    it('passes distinct id and traits through after init', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      identify('user-123', { is_anonymous: false })
      expect(identifyMock).toHaveBeenCalledWith('user-123', { is_anonymous: false })
    })
  })
})
