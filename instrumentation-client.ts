// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { initPostHog, onAnalyticsConsent } from '@/lib/analytics'

// PostHog runs alongside Sentry on the client. initPostHog() is a no-op when
// NEXT_PUBLIC_POSTHOG_KEY isn't set, and captures nothing until the visitor
// accepts analytics in the cookie banner.
initPostHog()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // No IP addresses, cookies or request headers on error reports.
  sendDefaultPii: false,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Replay rates only apply once the replay integration is added below,
  // which happens after the visitor accepts analytics.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
})

// Session replay records the screen, so it waits for analytics consent.
onAnalyticsConsent(() => {
  Sentry.addIntegration(Sentry.replayIntegration())
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
