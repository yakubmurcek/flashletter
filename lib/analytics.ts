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

/**
 * Identify the current user. PostHog automatically aliases the prior anonymous
 * distinct_id to the new id, so events fired before identify() (e.g. on the
 * hero before signInAnonymously resolves) still join the same funnel.
 *
 * For Supabase: pass `auth.user.id`, which is preserved across `linkIdentity`
 * — so the same call works for both fresh anon users and authed users.
 */
export function identify(distinctId: string, traits?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(distinctId, traits)
}

/**
 * Test-only helper. Resets the module-local init flag so a unit test can
 * exercise both the un-initialized no-op branch and the post-init pass-through
 * branch in the same file.
 */
export function _resetAnalyticsForTests() {
  initialized = false
}
