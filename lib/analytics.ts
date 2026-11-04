'use client'

import posthog from 'posthog-js'

/** Every funnel event the app sends. Add a name here before firing it. */
export type AnalyticsEvent =
  | 'url_pasted'
  | 'scrape_succeeded'
  | 'scrape_failed'
  | 'first_email_streamed'
  | 'email_edited'
  | 'limit_reached'
  | 'upgrade_clicked'
  | 'signup_completed'
  | 'checkout_completed'

// Module-local flag rather than introspecting posthog state — `posthog.__loaded`
// exists but isn't part of the public API, and we want a deterministic gate so
// `track()` never queues events into a half-initialized client.
let initialized = false

/** localStorage key the cookie banner writes the visitor's choice to. */
export const CONSENT_STORAGE_KEY = 'cookie-consent'

export interface StoredConsent {
  necessary: true
  analytics: boolean
  timestamp: string
}

const BROWSER_PERSISTENCE = 'localStorage+cookie' as const

const consentListeners = new Set<() => void>()

/** The visitor's stored cookie choice, or null when they haven't chosen. */
export function readConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConsent> | null
    if (!parsed || typeof parsed !== 'object') return null
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : '',
    }
  } catch {
    return null
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true
}

/**
 * Run `listener` once analytics consent exists: right away when it already
 * does, otherwise when the visitor accepts. Used to start Sentry session
 * replay only after consent. Returns an unsubscribe function.
 */
export function onAnalyticsConsent(listener: () => void): () => void {
  if (hasAnalyticsConsent()) {
    listener()
    return () => {}
  }
  consentListeners.add(listener)
  return () => {
    consentListeners.delete(listener)
  }
}

/**
 * Store the visitor's cookie choice and apply it. Accepting switches PostHog
 * from in-memory to browser storage and starts capturing; declining keeps it
 * off. Works without PostHog configured (the choice is still remembered).
 */
export function saveConsent(analytics: boolean) {
  if (typeof window === 'undefined') return
  const consent: StoredConsent = {
    necessary: true,
    analytics,
    timestamp: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }

  if (!analytics) {
    if (initialized && posthog.has_opted_in_capturing()) posthog.opt_out_capturing()
    return
  }

  if (initialized) {
    posthog.set_config({ persistence: BROWSER_PERSISTENCE })
    posthog.opt_in_capturing()
  }
  const listeners = [...consentListeners]
  consentListeners.clear()
  for (const listener of listeners) listener()
}

/**
 * Initialize PostHog in the browser. Safe to call from server-rendering paths
 * (no-ops on the server), safe to call multiple times (only the first call
 * does anything), safe to call without `NEXT_PUBLIC_POSTHOG_KEY` set (no-ops
 * so dev environments stay silent).
 *
 * Nothing is captured or stored in the browser until the visitor accepts
 * analytics in the cookie banner: PostHog starts opted out with in-memory
 * persistence, and only a stored `analytics: true` choice opts it in.
 */
export function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  const consented = hasAnalyticsConsent()

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // History-change pageviews so SPA navigation between /, /create, /campaigns
    // is captured without us instrumenting every route.
    capture_pageview: 'history_change',
    // No cookies or localStorage before consent.
    persistence: consented ? BROWSER_PERSISTENCE : 'memory',
    opt_out_capturing_by_default: true,
    // Don't capture exceptions — Sentry already does that and we don't want
    // duplicate error reporting downstream.
    capture_exceptions: false,
  })

  initialized = true

  if (consented) {
    if (!posthog.has_opted_in_capturing()) posthog.opt_in_capturing()
  } else if (posthog.has_opted_in_capturing()) {
    // PostHog's own opt-in marker outlived the visitor's stored choice.
    posthog.opt_out_capturing()
  }
}

/**
 * Capture a funnel event. No-op until `initPostHog()` has run, and dropped by
 * PostHog while the visitor hasn't accepted analytics, so call sites don't
 * need to guard.
 */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, props)
}

/**
 * Identify the current user. PostHog automatically aliases the prior anonymous
 * distinct_id to the new id, so events fired before identify() (e.g. on the
 * hero before signInAnonymously resolves) still join the same funnel.
 *
 * For Supabase: pass `auth.user.id`, which is preserved across `linkIdentity`
 * — so the same call works for both fresh anon users and authed users.
 *
 * `signup_completed` is NOT derived here: it fires where an account is
 * actually created (auth form, guest upgrade, OAuth callback flag).
 */
export function identify(distinctId: string, traits?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(distinctId, traits)
}

/** Forget the identified user on sign-out so the next person starts fresh. */
export function resetAnalytics() {
  if (!initialized) return
  posthog.reset()
}

/**
 * Test-only helper. Resets the module-local state so a unit test can exercise
 * both the un-initialized no-op branch and the post-init pass-through branch
 * in the same file.
 */
export function _resetAnalyticsForTests() {
  initialized = false
  consentListeners.clear()
}
