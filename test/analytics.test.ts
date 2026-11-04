import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installLocalStoragePolyfill } from './_helpers/storage-polyfill'

// Node 22+ injects a no-op localStorage that shadows jsdom's; install the
// real polyfill before any test runs (consent lives in localStorage).
installLocalStoragePolyfill()

const captureMock = vi.fn()
const identifyMock = vi.fn()
const initMock = vi.fn()
const setConfigMock = vi.fn()
const optInMock = vi.fn()
const optOutMock = vi.fn()
const resetMock = vi.fn()
let optedIn = false

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => initMock(...args),
    capture: (...args: unknown[]) => captureMock(...args),
    identify: (...args: unknown[]) => identifyMock(...args),
    set_config: (...args: unknown[]) => setConfigMock(...args),
    opt_in_capturing: (...args: unknown[]) => {
      optedIn = true
      optInMock(...args)
    },
    opt_out_capturing: (...args: unknown[]) => {
      optedIn = false
      optOutMock(...args)
    },
    has_opted_in_capturing: () => optedIn,
    reset: (...args: unknown[]) => resetMock(...args),
  },
}))

import {
  initPostHog,
  track,
  identify,
  resetAnalytics,
  saveConsent,
  readConsent,
  hasAnalyticsConsent,
  onAnalyticsConsent,
  CONSENT_STORAGE_KEY,
  _resetAnalyticsForTests,
} from '@/lib/analytics'

function storeConsent(analytics: boolean) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ necessary: true, analytics, timestamp: '2026-10-16T00:00:00.000Z' }),
  )
}

beforeEach(() => {
  for (const m of [
    initMock,
    captureMock,
    identifyMock,
    setConfigMock,
    optInMock,
    optOutMock,
    resetMock,
  ]) {
    m.mockReset()
  }
  optedIn = false
  _resetAnalyticsForTests()
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST
  window.localStorage.clear()
})

afterEach(() => {
  _resetAnalyticsForTests()
  window.localStorage.clear()
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

  describe('consent', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
    })

    it('starts opted out with in-memory persistence when there is no stored consent', () => {
      initPostHog()
      const options = initMock.mock.calls[0][1]
      expect(options.opt_out_capturing_by_default).toBe(true)
      expect(options.persistence).toBe('memory')
      expect(optInMock).not.toHaveBeenCalled()
      expect(hasAnalyticsConsent()).toBe(false)
    })

    it('stays opted out when the visitor declined analytics earlier', () => {
      storeConsent(false)
      initPostHog()
      expect(initMock.mock.calls[0][1].persistence).toBe('memory')
      expect(optInMock).not.toHaveBeenCalled()
    })

    it('opts out again if posthog still holds an opt-in the visitor no longer has', () => {
      optedIn = true
      storeConsent(false)
      initPostHog()
      expect(optOutMock).toHaveBeenCalled()
    })

    it('opts in with browser persistence when stored consent allows analytics', () => {
      storeConsent(true)
      initPostHog()
      expect(initMock.mock.calls[0][1].persistence).toBe('localStorage+cookie')
      expect(optInMock).toHaveBeenCalledTimes(1)
    })

    it('ignores a malformed consent value', () => {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, '{not json')
      expect(readConsent()).toBeNull()
      initPostHog()
      expect(initMock.mock.calls[0][1].persistence).toBe('memory')
    })

    it('accepting switches persistence to the browser and opts in', () => {
      initPostHog()
      saveConsent(true)
      expect(setConfigMock).toHaveBeenCalledWith({ persistence: 'localStorage+cookie' })
      expect(optInMock).toHaveBeenCalledTimes(1)
      expect(readConsent()?.analytics).toBe(true)
      expect(hasAnalyticsConsent()).toBe(true)
    })

    it('declining stores the choice and keeps tracking off', () => {
      initPostHog()
      saveConsent(false)
      expect(optInMock).not.toHaveBeenCalled()
      expect(setConfigMock).not.toHaveBeenCalled()
      expect(readConsent()?.analytics).toBe(false)
    })

    it('stores the choice even when PostHog is not configured', () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
      initPostHog()
      saveConsent(true)
      expect(readConsent()?.analytics).toBe(true)
      expect(optInMock).not.toHaveBeenCalled()
    })

    it('runs consent listeners on accept, and right away if consent was already given', () => {
      const early = vi.fn()
      const stop = onAnalyticsConsent(early)
      expect(early).not.toHaveBeenCalled()
      saveConsent(true)
      expect(early).toHaveBeenCalledTimes(1)
      stop()

      const late = vi.fn()
      onAnalyticsConsent(late)
      expect(late).toHaveBeenCalledTimes(1)
    })

    it('does not run consent listeners when the visitor declines', () => {
      const listener = vi.fn()
      onAnalyticsConsent(listener)
      saveConsent(false)
      expect(listener).not.toHaveBeenCalled()
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

    it('accepts checkout_completed as an event name', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      track('checkout_completed', { interval: 'month' })
      expect(captureMock).toHaveBeenCalledWith('checkout_completed', { interval: 'month' })
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

    it('fires once when the same user id goes from anon to identified', () => {
      identify('anon-1', { is_anonymous: true })
      // Still no fire — they're entering the funnel, not completing it.
      let signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(0)

      // linkIdentity / updateUser keep the Supabase user id.
      identify('anon-1', { is_anonymous: false })
      signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(1)
    })

    it('does not double-fire if identify is called repeatedly for an authed user', () => {
      identify('anon-1', { is_anonymous: true })
      identify('anon-1', { is_anonymous: false })
      identify('anon-1', { is_anonymous: false })
      identify('anon-1', { is_anonymous: false })

      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(1)
    })

    it('does not re-fire after a sign-out + new-anon cycle in the same browser', () => {
      // First conversion in this browser.
      identify('anon-1', { is_anonymous: true })
      identify('anon-1', { is_anonymous: false })
      expect(captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')).toHaveLength(1)

      // User signs out, a fresh anon session begins, and they log back into
      // the account they already made. Not a new signup.
      identify('anon-2', { is_anonymous: true })
      identify('anon-1', { is_anonymous: false })

      expect(captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')).toHaveLength(1)
    })

    it('treats undefined traits as identified (does not set anon marker)', () => {
      identify('user-123')
      identify('user-123', { is_anonymous: false })

      // No anon was ever marked, so no signup fires.
      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(0)
    })

    it('does not fire when a guest logs into an existing (older) account', () => {
      identify('anon-1', { is_anonymous: true })
      identify('existing-user', { is_anonymous: false }, { createdAt: '2025-01-01T00:00:00Z' })

      expect(captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')).toHaveLength(0)
    })

    it('fires for a fresh account that never was a guest (pricing → signup, Google)', () => {
      const justNow = new Date(Date.now() - 30_000).toISOString()
      identify('new-user', { is_anonymous: false }, { createdAt: justNow })
      identify('new-user', { is_anonymous: false }, { createdAt: justNow })

      const signupCalls = captureMock.mock.calls.filter((c) => c[0] === 'signup_completed')
      expect(signupCalls).toHaveLength(1)
      expect(signupCalls[0][1]).toEqual({ method: 'direct' })
    })
  })

  describe('resetAnalytics', () => {
    it('resets posthog so the next user in the browser starts clean', () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
      initPostHog()
      resetAnalytics()
      expect(resetMock).toHaveBeenCalledTimes(1)
    })

    it('no-ops before init', () => {
      resetAnalytics()
      expect(resetMock).not.toHaveBeenCalled()
    })
  })
})
