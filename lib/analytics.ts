'use client'

import posthog from 'posthog-js'

// Module-local flag rather than introspecting posthog state — `posthog.__loaded`
// exists but isn't part of the public API, and we want a deterministic gate so
// `track()` never queues events into a half-initialized client.
let initialized = false

/**
 * Initialize PostHog in the browser. Safe to call from server-rendering paths
 * (no-ops on the server), safe to call multiple times (only the first call
 * does anything), safe to call without `NEXT_PUBLIC_POSTHOG_KEY` set (no-ops
 * so dev environments stay silent).
 */
export function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // History-change pageviews so SPA navigation between /, /create, /campaigns
    // is captured without us instrumenting every route.
    capture_pageview: 'history_change',
    persistence: 'localStorage+cookie',
    // Don't capture exceptions — Sentry already does that and we don't want
    // duplicate error reporting downstream.
    capture_exceptions: false,
  })

  initialized = true
}

/**
 * Capture a funnel event. No-op until `initPostHog()` has run, so call sites
 * don't need to guard.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, props)
}

// localStorage keys backing the anon → identified transition detection. Only
// read/written from inside `identify()` so the rest of the codebase doesn't
// have to know they exist.
const ANON_SEEN_KEY = 'fl_analytics_anon_seen'
const SIGNUP_FIRED_KEY = 'fl_analytics_signup_fired'

/**
 * Identify the current user. PostHog automatically aliases the prior anonymous
 * distinct_id to the new id, so events fired before identify() (e.g. on the
 * hero before signInAnonymously resolves) still join the same funnel.
 *
 * For Supabase: pass `auth.user.id`, which is preserved across `linkIdentity`
 * — so the same call works for both fresh anon users and authed users.
 *
 * Side effect: when traits indicate a transition from `is_anonymous: true` to
 * `is_anonymous: false` for the first time in this browser, fires
 * `signup_completed` exactly once. This is the funnel-grade conversion event:
 * a returning authed user signing in does NOT trigger it (no prior anon
 * marker), while a hero-flow user upgrading via OAuth does (we set the marker
 * on the anon identify earlier in the flow).
 */
export function identify(distinctId: string, traits?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(distinctId, traits)

  if (typeof window === 'undefined') return
  const isAnon = traits?.is_anonymous === true

  if (isAnon) {
    // First time we've ever seen an anon Supabase user in this browser is the
    // "entered the funnel" marker. Subsequent anon identifies (same session,
    // unchanged user) are no-ops.
    window.localStorage.setItem(ANON_SEEN_KEY, '1')
    return
  }

  // Identified-user branch. Only fire signup_completed if we have evidence the
  // user was previously anonymous in this browser AND we haven't already
  // counted them. Both conditions together keep returning logins out of the
  // funnel and prevent double-counting on refresh.
  const wasAnon = window.localStorage.getItem(ANON_SEEN_KEY) === '1'
  const alreadyFired = window.localStorage.getItem(SIGNUP_FIRED_KEY) === '1'
  if (wasAnon && !alreadyFired) {
    posthog.capture('signup_completed')
    window.localStorage.setItem(SIGNUP_FIRED_KEY, '1')
    // Clear the anon marker so subsequent sign-out / fresh-anon cycles don't
    // re-arm without a corresponding upgrade.
    window.localStorage.removeItem(ANON_SEEN_KEY)
  }
}

/**
 * Test-only helper. Resets the module-local init flag so a unit test can
 * exercise both the un-initialized no-op branch and the post-init pass-through
 * branch in the same file.
 */
export function _resetAnalyticsForTests() {
  initialized = false
}
