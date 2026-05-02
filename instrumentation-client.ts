// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { initPostHog } from '@/lib/analytics'

// PostHog runs alongside Sentry on the client. initPostHog() is a no-op when
// NEXT_PUBLIC_POSTHOG_KEY isn't set, so dev environments without analytics
// stay silent.
initPostHog()

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adds request headers and IP for users
  sendDefaultPii: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
