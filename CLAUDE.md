# Flashletter

Turns a landing-page URL into a multi-email campaign sequence: scrape → analyze →
AI-generate → edit in browser. Next.js App Router on Vercel, Supabase for auth +
storage, Claude (Anthropic API, `lib/ai.ts`) for generation, Vitest + jsdom for tests.

**Goal:** solo dev shipping their first meaningful product — priority is what
converts and sells (paying users, real demand), not feature breadth, technical
polish, or exhaustive coverage. Bias decisions accordingly.

## Git workflow

- **Default branch:** `dev`. New PRs auto-target it.
- **Production branch:** `main`. Reachable only via a `dev → main` PR. The
  `main-guard` workflow fails any PR to `main` whose head isn't `dev`. Otherwise
  hands-off — see the production-branch rule in the global `CLAUDE.md`.
- **Merges:** squash-only. Head branch auto-deleted on merge. Linear history
  required on `main`.
- **Pre-commit:** Husky + lint-staged auto-format on commit. CI on every PR runs
  format · lint · typecheck (tests run inside the same job and still gate merges
  — the check name just omits "test" for brevity).

## Project state outside the repo

Ongoing TODOs, deferred decisions (pricing/paywall placement, anon→account
hand-off, time-to-aha streaming, etc.), and session-to-session context live in
local Claude memory at:

```
~/.claude/projects/-Users-yakub-Projects-flashletter/memory/
```

That directory is local-only — collaborators won't see it. Anything that should
be repo-discoverable belongs in a committed doc, not memory.
