import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installLocalStoragePolyfill } from './_helpers/storage-polyfill'

// Node 22+ injects a no-op localStorage that shadows jsdom's; install the
// real polyfill before any test runs (transition detection writes to it).
installLocalStoragePolyfill()

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

import { initPostHog, track, identify, _resetAnalyticsForTests } from '@/lib/analytics'

beforeEach(() => {
  initMock.mockReset()
  captureMock.mockReset()
  identifyMock.mockReset()
  _resetAnalyticsForTests()
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST
  // Transition detection persists in localStorage; jsdom keeps state across
  // tests in the same file so reset by hand to avoid cross-test bleed.
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
  }
})

afterEach(() => {
  _resetAnalyticsForTests()
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
  }
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

  describe('signup_completed transition detection', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
    })

    it('does not fire on a returning authed user (no prior anon marker)', () => {
      identify('user-123', { is_anonymous: false })

      // identify itself runs, but capture('signup_completed') must not.
      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(0)
    })

    it('fires once when the same browser goes from anon to identified', () => {
      identify('anon-1', { is_anonymous: true })
      // Still no fire — they're entering the funnel, not completing it.
      let signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(0)

      identify('user-after-link', { is_anonymous: false })
      signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(1)
    })

    it('does not double-fire if identify is called repeatedly for an authed user', () => {
      identify('anon-1', { is_anonymous: true })
      identify('user-link', { is_anonymous: false })
      identify('user-link', { is_anonymous: false })
      identify('user-link', { is_anonymous: false })

      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(1)
    })

    it('does not re-fire after a sign-out + new-anon cycle in the same browser', () => {
      // First conversion in this browser.
      identify('anon-1', { is_anonymous: true })
      identify('user-1', { is_anonymous: false })
      expect(captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')).toHaveLength(1)

      // User signs out and a fresh anon session begins. They sign in again.
      // Funnel-grade semantics: this browser already converted; don't count
      // them again.
      identify('anon-2', { is_anonymous: true })
      identify('user-2', { is_anonymous: false })

      expect(captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')).toHaveLength(1)
    })

    it('treats undefined traits as identified (does not set anon marker)', () => {
      identify('user-123')
      identify('user-123', { is_anonymous: false })

      // No anon was ever marked, so no signup fires.
      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(0)
    })
  })
})
