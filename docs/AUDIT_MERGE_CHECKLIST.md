# Audit merge + post-merge checklist

The bug audit produced 21 findings across security, correctness, and quality.
All 21 are fixed across **PRs #26 – #31** against `dev`. This file is the
checklist for shipping them — written down so future-me doesn't have to
reconstruct it from memory or scroll back through chat.

## Merge order

Each PR is branched off `dev` (not stacked). Conflicts are mechanical
(adjacent edits to the same imports / files), no semantic overlap. Suggested
order minimises rebase work:

1. **#26** `fix/audit-security` — SSRF, open redirect, waitlist PII, IP spoofing, silent rate-limit
2. **#30** `fix/waitlist-hardening` — order race migration, signed unsubscribe, actual erasure
3. **#27** `fix/auth-and-validation` — auth on AI routes, size caps, chat parsing, error sanitize
4. **#28** `fix/campaign-ownership` — ownership re-checks, version-restore via UUID
5. **#29** `fix/version-preservation` — UUID-preserving saveEmails, debounced version writes
6. **#31** `fix/cleanup-batch` — Markdown HTML off, KEYS→SCAN, loader reload, eslint gate

## Required operational steps

### Before merging #26

In Vercel → project → Environment Variables (Production):

- `ADMIN_EMAILS=murcja812@gmail.com`
  Without this, `/admin/waitlist` 404s for everyone, including you.
- Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist.
  Rate-limiting now **fails closed** in production — missing creds means
  every rate-limited route returns 429 the moment this ships.

### Before merging #30

In Vercel → project → Environment Variables (Production):

- `WAITLIST_UNSUBSCRIBE_SECRET=<any-high-entropy-string>`
  Used to sign unsubscribe links. Keep it stable for the lifetime of any
  links already mailed. Without it, the token path silently rejects every
  token; the bare-email fallback still works.

In the Supabase SQL editor (project → SQL → new query):

- Paste and run the contents of
  `migrations/replace_waitlist_order_trigger_with_sequence.sql`.
  Idempotent — safe to re-run if the deploy script gets nervous.

### After merging #31

`pnpm build` will now actually run lint as a gate (was previously silenced
by `eslint.ignoreDuringBuilds: true`). Codebase is currently clean, so no
immediate action — but a future PR that introduces a lint warning will fail
the build. CI already lints on every PR so this isn't a behavior change in
practice.

## Audit-finding → PR mapping

| # | Issue | PR |
|---|---|---|
| 1 | Public PII leak (`GET /api/waitlist`, `/admin/waitlist`) | #26 |
| 2 | SSRF in `/api/scrape-landing(/stream)` + Playwright | #26 |
| 3 | Email-generation routes don't verify campaign ownership | #28 |
| 4 | Open redirect via `?redirectTo=` in auth-form | #26 |
| 5 | Rate-limit silently disabled when Redis env missing | #26 |
| 6 | IP-spoofable `x-forwarded-for[0]` rate-limit identifier | #26 |
| 7 | `saveEmails` delete-then-insert wipes version history | #29 |
| 8 | `MAX(order)+1` waitlist trigger races under concurrency | #30 |
| 9 | Waitlist email enumeration via signup + unsubscribe responses | #26 |
| 10 | Anyone-can-unsubscribe-anyone with just an email | #30 |
| 11 | No size cap on `landingContent` / `tone` / `campaignType` | #27 |
| 12 | `email_versions` row inserted per keystroke | #29 |
| 13 | Restore-from-history accepted JSON content via URL | #28 |
| 14 | `getUserFriendlyMessage` leaks raw `error.message` | #27 |
| 15 | Tiptap Markdown `html: true` → potential stored XSS | #31 |
| 16 | `redis.keys('*')` blocks Redis under load | #31 |
| 17 | `parseOpenAIResponse` doesn't validate model JSON | #27 |
| 18 | `useCampaignLoader` doesn't reload on URL id change | #31 |
| 19 | AI/scrape routes accepted unauthenticated callers | #27 |
| 20 | Unsubscribe was a soft-flag, not real GDPR erasure | #30 |
| 21 | `eslint.ignoreDuringBuilds: true` hid lint regressions | #31 |
