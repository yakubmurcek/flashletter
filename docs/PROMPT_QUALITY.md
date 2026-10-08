# Email prompt quality

The generation prompts live in `app/api/generate-emails/prompts.ts`. Every builder there
(`buildInstructions`, `buildFirstEmailInstructions`, `buildRemainingEmailsInstructions`)
includes the shared `writingRules()` block.

## Why the rules exist (2026-10-08)

Before them, Claude Sonnet wrote, on real pages:

- telegraphic fragments ("Day 3. Cost. Fair.") and one-line paragraphs;
- whole emails about facts the page doesn't state ("we won't quote prices, check the site"),
  because the analysis listed pricing as a gap to fill;
- the guardrails themselves ("we don't have customer stories and won't make any up");
- meta talk about the sequence ("over the next few days we'll show you...").

Each rule in `writingRules()` targets one of these. Don't remove one without re-running the
check below.

## How to check a prompt change

There is no Anthropic key on the dev boxes; the key lives only in Vercel. Test on the branch
preview, which runs the real scrape, analysis and generation pipeline:

1. Push the branch; wait for the Vercel preview.
2. Get a share link for the protected preview (Vercel MCP `get_access_to_vercel_url`).
3. With Playwright: open `/?_vercel_share=<token>`, paste a URL into the hero box, press
   Generate, wait for "5 total" in the editor sidebar, then click each email and read the
   subject and `.ProseMirror` text.
4. Use pages with different amounts of material: rich (plausible.io, cal.com), thin
   (resend.com, where the scraper gets little text).

Look for: fragments, emails without a concrete detail from the page, guardrail leaks, em
dashes, and a CTA that isn't a Markdown link.

## Speed of the first email (2026-10-08)

The visitor waits for the scrape, then the page analysis (`lib/utils/analyzer.ts`), then
the first email. The analysis wait is mostly output length: at medium effort with
uncapped lists it took 10-14 s. It now runs at `effort: 'low'`, and the schema
descriptions in `lib/schemas/analysis.ts` cap each list. On plausible.io the first email
went from about 26 s to about 16 s after pasting the URL, and the emails still cited the
page's numbers and quotes. JS-heavy pages add about 9 s of Playwright fetching
(cal.com, linear.app, resend.com).
