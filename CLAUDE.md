# Flashletter

Turns a landing-page URL into a multi-email campaign sequence: scrape → analyze →
AI-generate → edit in browser. Next.js App Router on Vercel, Supabase for auth +
storage, Claude (Anthropic API, `lib/ai.ts`) for generation, Vitest + jsdom for tests.

**Goal:** solo dev shipping their first meaningful product — priority is what
converts and sells (paying users, real demand), not feature breadth, technical
polish, or exhaustive coverage. Bias decisions accordingly.

## Git workflow

- **One branch, `main`, always production** (trunk-based since 2026-11-25; `dev` is retired).
  Work happens on short branches (`feat/...`, `fix/...`) merged into `main` by PR.
- **Enforced by the ruleset on `main`** (Settings → Rules), not by habit: no direct pushes or force
  pushes, squash-only, and every required check green: `format · lint · typecheck` (tests with coverage,
  the knip unused-code and jscpd copy-paste gates inside),
  `database · migrations match schema`, `e2e · main flows`, `PR title` (`type(scope): summary`) and `PR size`
  (400 changed lines, lockfile and generated schema excluded; the `big-ok` label overrides).
- **Pre-commit:** Husky + lint-staged: Biome lint and Prettier on staged files.
- **Lint:** Biome + a type-aware ESLint for un-awaited promises (README "Lint code"). Never add a file
  to a `biome.json` override list; only remove fixed ones.
- **Database changes:** README "Start the local database".
- **End-to-end tests** (`e2e/`, `pnpm test:e2e`): every main user flow on desktop and phone against
  the local database, Claude replaced by `e2e/fake-claude.mjs`, Stripe in test mode. A new user-facing
  flow gets its test in the same PR.
- **Security rules, each with a test:** every API route checks the session and the database's
  row-level security checks ownership; public forms and paid actions are rate limited
  (`lib/utils/rate-limit.ts`); a Stripe outage keeps each user's last confirmed plan, never free Pro;
  `scripts/check-client-bundle.sh` fails CI when a server secret reaches the browser bundle.

## Project state outside the repo

Ongoing TODOs, deferred decisions (pricing/paywall placement, anon→account
hand-off, time-to-aha streaming, etc.), and session-to-session context live in
local Claude memory at:

```
~/.claude/projects/-Users-yakub-Projects-flashletter/memory/
```

That directory is local-only — collaborators won't see it. Anything that should
be repo-discoverable belongs in a committed doc, not memory.
