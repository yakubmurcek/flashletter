# Production environment checklist

Things that have to be set in Vercel (or wherever this is deployed) **before**
shipping. Each entry says what fails silently or loudly if it's missing.

## Required

### `ANTHROPIC_API_KEY`

Claude API key, used by every AI route through `lib/ai.ts`. Without it,
generate-emails / chat / analyzer all 500. Vault name:
`FLASHLETTER_ANTHROPIC_API_KEY`.

### `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Auth + database. Without them the Supabase client throws on construction and
the app won't render.

## Recommended

### `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`)

Shared rate limits across serverless instances. Without them the limits live in
each instance's memory (`MemoryLimiter` in `lib/utils/rate-limit.ts`): still on,
but a client hitting several instances gets the limit once per instance. The
Upstash integration on the Vercel Marketplace injects the `KV_REST_API_*` names,
which the app also reads.

Redis also holds the monthly plan counters: AI rewrites, and the set of
campaigns each Free or guest user generated this month. Without Redis the
campaign limit falls back to counting rows, so deleting a campaign frees a
slot again.

Current setup (2026-10-08): flashletter uses the team's existing Upstash store
`store_GDbJAU71nVY35Lbf`, which it shares with shouldijev. Every flashletter key is
prefixed `flashletter:`. `KV_REST_API_URL` and `KV_REST_API_TOKEN` were copied onto
flashletter as sensitive variables (Preview + Production) instead of attaching the store
through the integration, so if that store's token is ever rotated, update them here too.

## Required for specific features

### `RESEND_API_KEY` and `RESEND_FROM_ADDRESS`

Powers the "Send to my inbox" button in the editor. The button (and the
pricing bullet that mentions it) only shows when
`NEXT_PUBLIC_ENABLE_TEST_SEND=true`; set that only after both Resend vars work. `RESEND_API_KEY` comes from
the Resend dashboard. `RESEND_FROM_ADDRESS` is the verified-domain sender (e.g.
`Flashletter <hi@flashletter.app>`); for early testing, Resend's
`onboarding@resend.dev` works but only sends to the account-owner inbox.

Without both set, `/api/send-test-email` returns 500 with a clear server log
and the UI shows a generic "couldn't send right now" toast — the rest of the
app still works.

### `NEXT_PUBLIC_POSTHOG_KEY` and (optional) `NEXT_PUBLIC_POSTHOG_HOST`

Powers the funnel analytics. Without `NEXT_PUBLIC_POSTHOG_KEY` the analytics
wrapper no-ops silently — the app still works, you just lose the funnel.
`NEXT_PUBLIC_POSTHOG_HOST` defaults to `https://us.i.posthog.com`; override it
if your project lives in the EU instance.

Events fired (all client-side via `posthog-js`): `url_pasted`,
`scrape_succeeded`, `scrape_failed`, `first_email_streamed`, `email_edited`,
`limit_reached`, `upgrade_clicked`, `signup_completed`. `signup_completed`
fires from `identify()` in `lib/analytics.ts` the first time a browser that
was seen as a guest comes back signed in (two localStorage markers), so
returning logins don't count.

### `ADMIN_EMAILS`

Comma-separated list of email addresses allowed to view `/admin/waitlist`.
Without it the page returns 404 — including for you. Example:

```
ADMIN_EMAILS=you@example.com
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

## Database changes

The schema and RLS policies live in this repo: `supabase/migrations/` (one file per change, in order)
and `supabase/schemas/public.sql` (the whole schema, generated). See the README "Start the local
database". Live already has every migration up to `20261125133200_sync_live_drift.sql`, which records
what had been changed in the dashboard or the SQL editor before 2026-11-25.

Until CI applies migrations to live, a new migration is applied to live by hand before the code
that needs it deploys, and recorded with `supabase migration repair --status applied <version>`.

## What to verify after each deploy

1. Sign in with a non-admin account → `/admin/waitlist` should 404.
2. Sign in with an `ADMIN_EMAILS`-listed account → table renders.
3. Submit a landing-page URL of `http://169.254.169.254/`, and one that
   redirects there (e.g. `https://httpbin.org/redirect-to?url=http://169.254.169.254/`),
   on the home page → both should show "That address isn't reachable from the
   internet" (SSRF guard, checked on every redirect hop).
4. A count-only request for the waitlist with the public anon key must fail:
   `curl -sI "$SUPABASE_URL/rest/v1/waitlist?select=id" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Prefer: count=exact"`
   → 401/403, not 200 with a `content-range`.
5. POST to `/api/chat` ~15 times in a minute as the same user → should start
   getting 429s (rate-limit Redis is wired up).
