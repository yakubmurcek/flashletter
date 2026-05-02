# Production environment checklist

Things that have to be set in Vercel (or wherever this is deployed) **before**
shipping. Each entry says what fails silently or loudly if it's missing.

## Required

### `OPENAI_API_KEY`

Used by every AI route. Without it, generate-emails / chat / analyzer all 500.

### `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Auth + database. Without them the Supabase client throws on construction and
the app won't render.

### `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Rate limiting. Since the security audit (PR #26) the rate-limit module **fails
closed in production** when these are missing — every rate-limited route
(`/api/chat`, `/api/generate-emails(/stream)`, `/api/scrape-landing(/stream)`)
will return 429 until both are set. There is also a FATAL log line at startup,
visible in the Vercel function logs.

If you ever see "rate limit exceeded" right after a deploy and you didn't
hammer anything, check these two first.

## Required for specific features

### `RESEND_API_KEY` and `RESEND_FROM_ADDRESS`

Powers the "Send to my inbox" button in the editor. `RESEND_API_KEY` comes from
the Resend dashboard. `RESEND_FROM_ADDRESS` is the verified-domain sender (e.g.
`Flashletter <hi@flashletter.app>`); for early testing, Resend's
`onboarding@resend.dev` works but only sends to the account-owner inbox.

Without both set, `/api/send-test-email` returns 500 with a clear server log
and the UI shows a generic "couldn't send right now" toast — the rest of the
app still works.

### `ADMIN_EMAILS`

Comma-separated list of email addresses allowed to view `/admin/waitlist`.
Without it the page returns 404 — including for you. Example:

```
ADMIN_EMAILS=murcja812@gmail.com
```

### `SENTRY_AUTH_TOKEN`

Source map upload at build time. Build still works without it, but stack
traces in Sentry will be minified.

## Optional

### `ENABLE_PLAYWRIGHT_DEV`

Set to `false` in `.env.local` to skip Playwright in dev (faster iteration on
machines without Chromium installed). Has no effect in production.

### `NEXT_PUBLIC_APP_URL`

Used by the JSON-LD block in the root layout. Defaults to
`https://flashletter.app` if unset.

## What to verify after each deploy

1. Sign in with a non-admin account → `/admin/waitlist` should 404.
2. Sign in with an `ADMIN_EMAILS`-listed account → table renders.
3. Submit a landing-page URL of `http://169.254.169.254/` to the scraper →
   should reject with `URL not allowed` (SSRF guard).
4. POST to `/api/chat` ~15 times in a minute as the same user → should start
   getting 429s (rate-limit Redis is wired up).
