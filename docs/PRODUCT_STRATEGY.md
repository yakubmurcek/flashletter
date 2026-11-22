# Flashletter — Product Strategy

> Living strategy doc. Captures the _why_ behind product decisions so we can revisit, course-correct, and onboard collaborators without re-deriving the reasoning each time. Update as positions change. Last meaningful update: 2026-10-16 (market check, section 11).

---

## 1. TL;DR

- **Who we serve:** indie hackers / solo founders / build-in-public operators on X. Not enterprise, not non-technical small biz.
- **Job to be done:** "I have a landing page and need a welcome / nurture email sequence, but I don't want to write it from scratch."
- **Strategic position:** be a **tool** that plugs into the user's existing email platform — _not_ an ESP ourselves.
- **Moat:** ~~AI generation from a landing page URL → real, on-brand sequence in ~2 minutes.~~ **Contradicted by the 2026-10-16 market check (section 11):** the generation step is becoming a free ESP/agent feature, and no standalone tool shows paying demand.
- **Immediate next move:** ship test-send to inbox + Resend integration as the post-generation experience. Move the paywall to those value-confirming actions. Skipping the teaser/wait-for-data phase because AI-coded integration work is cheap enough to commit early.

---

## 2. Who we're building for

**Target:** the indie/build-in-public solo founder. Tech-comfortable, cost-conscious, allergic to enterprise software. They're on X, they ship in public, they read Indie Hackers, and they pick tools the same way Vercel-flavored devs pick tools — by what other indie builders use.

**Their existing email stack** (likely distribution):

- **Resend** (~40–50%) — dev-first, transactional roots, expanding into broadcasts/audiences.
- **Loops** (~25–35%) — built specifically for SaaS welcome flows, beloved by build-in-public crowd.
- **Beehiiv / Kit (ConvertKit)** (~10–15%) — newsletter / creator slant.
- **MailerLite / nothing yet** (~5–10%) — budget-conscious or pre-product.
- **Mailchimp** — _almost zero_ in this segment. It's the small-business-with-a-restaurant tool. Ignore it for at least a year.

**The pain we solve:** they already have an ESP (often on a free tier). The pain is _staring at a blank email composer_. Writing 7 emails takes a weekend or $500–2000 to a copywriter. We compress that to about 2 minutes with on-brand output.

**What this means for the product:** they don't need us to send. They need us to _write_. Anything we add beyond "great writing, easy to get out of the app" is mission creep.

---

## 3. Strategic position: tool, not ESP

**The decision:** flashletter is the AI copywriter that plugs into the user's existing ESP. We do not become an ESP.

**Why we're not becoming an ESP:**

1. **Pricing argument fails.** Our target user is on a free tier of Loops / Resend / Beehiiv / MailerLite. They're not cost-pressured. We can't undercut free.
2. **Deliverability is years of work.** DKIM/SPF/DMARC, IP warming, ISP reputation, bounce processing, complaint feedback loops, suppression lists. This is the _actual job_ of an ESP and our competitors have decades of head start.
3. **Compliance is a swamp.** CAN-SPAM, GDPR, CASL, consent records, unsubscribe handling. One screwup → blacklisted by Google/Microsoft → user's emails go to spam.
4. **Infra cost.** Even with SES/Postmark underneath, you still need: automation engine, scheduler, segmentation, webhook processing, bounce handling, suppression management, send-time logic. Months of work that produces something _worse_ than what Resend gives away free.
5. **Support burden explodes.** When our send fails, _their welcome flow is broken._ Angry messages at 2am.
6. **Existing ESPs are bolting on AI.** Loops, Resend, Kit all have AI assistance now. They can copy "generate from URL" in a sprint, and they already own sending infrastructure. The moment we split focus to send, we hand them our only durable advantage.

**Re-evaluate the position only if:** signups data shows ≥30% of users say "I don't have an ESP, I just want this to send for me." Until then, hold the line.

**Decision:** tool, not ESP.

---

## 4. ESP landscape cheat sheet

The space is confusing because all five categories _can_ send a welcome email. They're culturally distinct.

| Category                  | What they do                                        | Examples                                                         | Our user?                    |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| **Transactional senders** | One-to-one triggered emails (receipts, magic links) | Postmark, Resend, SendGrid, Mailgun, AWS SES                     | Yes — many indies start here |
| **Marketing ESPs**        | Broadcasts, automations, lists, segmentation        | Mailchimp, Kit (ConvertKit), MailerLite, Klaviyo, ActiveCampaign | Some — Kit/MailerLite slice  |
| **Newsletter platforms**  | Subscription + paid newsletters                     | Substack, Beehiiv, Ghost, Buttondown                             | Some — content-creator slice |
| **CRM-with-email**        | Email as part of a sales/marketing stack            | HubSpot, Customer.io, Intercom                                   | No — too heavy for indies    |
| **Modern hybrid**         | Transactional + marketing in one                    | **Loops**, **Resend Audiences**                                  | **Yes — primary target**     |

**Our integration priority order, when the time comes:** Resend → Loops → Kit → Beehiiv. Mailchimp is not in scope.

---

## 5. Onboarding flow analysis

**Current flow (the spine works):**

1. Land on `/`. Paste URL into hero.
2. Anonymous signup happens silently. Scrape + analyze landing page (~5–15s).
3. Smart defaults applied (friendly tone, nurture, 3 days). Configure step skipped.
4. Editor loads with `autogen=1`. Day 1 streams in within ~10–20s, remaining days follow.
5. **Total time to first email: ~20–35s.** This is good.

**What works:**

- Anonymous-first removes signup as an upfront friction.
- Smart defaults skip the configure step entirely on the hero path.
- Streaming means the user sees Day 1 while Days 2+ generate in parallel.

**Friction points and drop-off risks:**

- **Dead-air during scraping.** 5–15s of progress bar. Curious users can bounce here. Opportunity: stream the _extracted analysis_ ("Found: product name, value prop, target audience") so they're invested before generation finishes.
- **Aha moment isn't reinforced.** Day 1 streams in and the editor goes silent. No nudge, no celebration, no "here's what to do next." A first-edit coachmark would help.
- **Autosave is invisible.** Edits persist on a 1s debounce, but no "Saved" indicator. Anonymous users worry their work will vanish.
- **Empty hero = bounce.** No URL → no flow. Add 2–3 one-click example URLs ("Try with Linear / Notion / a sample SaaS") to let skeptics see the magic without committing.
- **Generation failure UX.** If Day N times out mid-stream, the partial state in the sidebar reads as a bug. Auto-retry the failed day with a small indicator, or convert the empty card into an explicit "retry."
- **Anon → auth handoff is unverified.** The upgrade prompt promises "your campaign will be saved." If the OAuth handoff doesn't reliably re-attach the campaign, that's a trust-shattering moment. Worth a manual end-to-end test.

**Critical blind spot:** **no product analytics.** Vercel Analytics gives page views, not funnel data. We can't see where users drop today. PostHog free tier + ~6 events (`url_pasted`, `scrape_succeeded`, `scrape_failed`, `first_email_streamed`, `email_edited`, `signup_completed`) would tell us which of these friction points actually matter.

**Decision / next action:** add product analytics first. Every other change is a guess until we can measure it.

---

## 6. Paywall placement

**Current:** the paywall fires when an anonymous user tries to start their **2nd campaign**. This is a cut-off, not an unlock. The user just made one campaign, may or may not have felt value yet, and is being told "pay to keep going."

**Target:** move the wall to actions that prove the user got value — actions where they're _reaching for the door_ with the work in hand. These are signup-triggering moments, not cost-of-entry moments.

**Specific value-confirming actions to gate:**

- Click **"Send test email to my inbox"** — this is the prime signup trigger. We literally need their email.
- Click **"Push to Resend"** — this is the _paid_ tier trigger (near-term, not far-future).

**Wall sequence:**

- **Free, ungated:** generate + edit + preview in the app.
- **Signup wall:** test-send. Same conversion event as today, but the user is converting _toward something they want_ instead of paying a toll.
- **Paid wall:** Resend push (and additional ESP integrations as they ship).

The 2nd-campaign limit can stay as a backstop for users who never convert via the value actions but keep generating. It just shouldn't be the primary trigger.

**Decision / next action:** wire the signup wall to test-send and copy-email actions. Demote the 2nd-campaign limit to backstop.

---

## 7. Post-generation experience

**The question:** what's the next step after the user sees their generated sequence in the editor?

**What we considered and rejected:**

- ❌ **Export bundle** (zip of HTML/MJML/CSV). Killed on instinct: technical-feeling, reads as _unfinished product_ — "here are some files, figure it out." Wrong vibe for a non-technical or even semi-technical user. **General principle: no technical-feeling deliverables.**
- ❌ **Copy-to-clipboard per email.** Looks like a feature but in practice is a chore — copying subject + body separately, 7 times per sequence, into editors that mangle formatting, while losing the sequence-level metadata (Day spacing, automation triggers). Users would touch it once, get frustrated, abandon. Fig-leaf completeness; cut it.
- ❌ **Teaser product** (test-send + interest-capture form, "we'll email you when integration is ready"). Honest but dead-ends users — they generate, like it, then leave with nothing usable. Acceptable only if integration is months out. AI-coded build makes integration weeks-not-months, so skip the teaser phase.
- ❌ **Build all ESP integrations at once.** Six different OAuth flows + schema mappings. Build one well first.
- ❌ **Become a sender ourselves.** See section 3.

**What we're building:**

- ✅ **Test-send to inbox.** "Send Day 1 to my inbox" button. One Resend API call from our side. Massive emotional payoff — user sees their AI-written email arrive in Gmail looking real. Converts skepticism to belief. **This is the magic moment.** Signup wall lives here.
- ✅ **Resend integration ("Push to Resend").** User connects their Resend account, we create the audience + broadcast/sequence in _their_ Resend workspace. They send via their own warmed sender, we just write and orchestrate. Paid tier lives here. Justified by AI-coded development making the integration cheap to build.

**Sequencing note:** test-send first (smaller, also unblocks the signup wall), then Resend integration (the actual product completeness). Both should ship before we worry about Loops / Kit / Beehiiv as second integrations.

**Decision / next action:** ship test-send with signup wall. Then build Resend integration as the paid-tier feature.

---

## 8. Research strategy without an audience

**Constraint:** no X / LinkedIn following. Standard "post a poll" advice doesn't work for us yet.

**Replacements:**

1. **Bake the question into the product.** Add one optional field to signup or post-generation: "What email tool do you currently use? (Resend / Loops / Beehiiv / Kit / Mailchimp / Nothing yet / Other)." Every new user passively answers. After ~50 signups we have real data, no audience required. **This is the move.**
2. **Direct outreach to first ~20 users.** Personal email: "Hey, saw you signed up — quick q, what tool are you using to send email today?" Indies are surprisingly responsive to founder DMs.
3. **Borrow other communities' audiences.** Post one focused question in r/SideProject, r/indiehackers, IndieHackers.com, WIP.co. Skip X polls until we have followers.

**Decision / next action:** add the "what tool do you use?" question to the signup flow this week.

---

## 9. Build sequence

**This week:**

1. Verify anon → auth campaign handoff works end-to-end (manual test, ~10 min). Foundation check before anything else.
2. Add product analytics (PostHog free tier + ~6 funnel events). Without this, every other decision is a guess.
3. Build test-send to inbox (with signup wall).

**Next 1–3 weeks:**

- Build Resend integration: user connects Resend account → we push the generated sequence as audience + broadcasts/automation in their workspace. This is the paid-tier feature.
- Polish smaller UX wins along the way: scrape-progress streaming the analysis, autosave indicator, hero example URLs, generation-failure retry.

**After Resend integration ships:**

- Watch which non-Resend users ask for what. Build the second integration based on demand. Likely Loops or Kit.
- Continue funnel analytics review. Tune the test-send → signup → paid funnel.

**Deferred indefinitely (don't drift here):**

- Becoming an ESP / sender.
- Mailchimp integration.
- Team accounts, approval workflows, brand-voice uploads (enterprise features).
- A third integration before the first two have real paying usage.

---

## 10. Open questions / unknowns

- **Which ESP wins the _second_ integration?** Resend is locked in as #1. Loops is the strong default for #2 but watch the data after launch.
- **Resend integration shape: API key vs OAuth?** API key is simpler to ship, OAuth is friendlier to users. Pick API key for v1 unless OAuth is trivial.
- **Resend integration shape: audience + broadcasts vs sequence-as-automation?** Resend's "Audiences" + "Broadcasts" map to one-shots; their automation primitives may or may not match our day-spaced sequence semantics. Needs a quick spike to confirm we can faithfully push a 7-day drip.
- **Does test-send need rate limiting?** Free Resend tier is 3k/mo — at 100 users sending ~3 tests each we're at the cap. Need to think through abuse + cost before launch.
- **Pricing for the paid tier (Resend push).** Per-active-sequence? Per-month flat? Free first sequence then paid? Open.
- **Is the 3-day default still right?** Default sequence length should be tested — too short risks feeling thin, too long risks generation latency.
- **Onboarding nudge after first email streams in?** Need to design what that coachmark actually says and when it fires.

---

## 11. Market check 2026-10-16 (data, not gut)

Researched 2026-10-16 from fetched sources. Own usage data: **unknown**, not zero. Production has no funnel analytics (PostHog/Sentry keys missing, task #597), and Vercel keeps only the last ~30 minutes of logs. Stripe is still in test mode (task #381), so the product cannot take money yet.

**The core feature is becoming free**

- Resend's AI editor turns a URL into one email draft ([resend.com/blog/ai-email-editor](https://www.resend.com/blog/ai-email-editor)).
- Official MCP servers let Claude write sequences straight into the user's own account as drafts: Resend (create automations, templates, broadcasts; [docs](https://resend.com/docs/mcp-server)), beehiiv (builds automations, cannot activate; [support](https://www.beehiiv.com/support/article/39255979546263-how-to-access-the-beehiiv-mcp-to-connect-your-ai-tools)), Loops (Workflows API, drafts; [changelog](https://loops.so/changelog/workflows-api-claude-connector)).
- The planned paid tier, "Push to Resend" (section 7), is what Resend's own MCP already does for free.

**Standalone generators show no paying demand**

- Email Sequence AI: $3 all-time, $0 MRR, Stripe-verified ([trustmrr.com](https://trustmrr.com/startup/email-sequence-ai)).
- Lumail, the best verified result: $580 MRR, and it is a full ESP rather than a generator ([trustmrr.com](https://trustmrr.com/startup/lumail.md)).
- Vayno, "AI Email Sequence Generator from Any Landing Page", is nearly this product: 2 points and 0 comments on HN ([HN](https://news.ycombinator.com/item?id=45802673)).

**Search demand is tiny**

- "email sequence generator": 30 searches/month, US.
- "email sequence": 480 searches/month, US ([seodata.dev](https://www.seodata.dev/keyword/email-sequence-generator)).

**Pain threads are rare (HN only)**

- Only two organic asks on HN since 2025-01. Reddit and Indie Hackers could not be read, so this means no willingness-to-pay evidence was found, not that there is no demand.

**What still pays is a person doing the work**

- Czech agencies list 4,000–14,000 Kč per flow and from 6,400 Kč for an audit ([pudeto.cz](https://pudeto.cz/e-mail-marketing/)).
- Digismoothie lists 7,500 Kč per flow ([digismoothie.com](https://www.digismoothie.com/cs/services/e-mail-marketing)).
- These are list prices, not proof of sales.

**Czech ESPs already include AI**

- Ecomail includes AI on every plan ([ecomail.cz/cenik](https://www.ecomail.cz/cenik)).
- SmartEmailing has AI in your brand voice and a Shoptet abandoned-cart setup ([smartemailing.cz/cenik](https://www.smartemailing.cz/cenik/)).
- So a Czech self-serve tool would compete with free.

**Labeled, not relied on**

- Klaviyo claims "with just a website URL" for flows, but only on a marketing page, and the feature is in beta.
- Jasper traffic sources conflict.
- AI-writing market-size estimates differ by roughly 40x.

**Proposed direction (pending founder decision)**

- Use flashletter as the in-house engine behind a Czech done-for-you sequence service, not as a self-serve SaaS. Generation already writes in the landing page's language (`app/api/generate-emails/prompts.ts`); Czech output quality is unverified.
- Test: one-page offer, a 5-email welcome series at 4,900 Kč with a money-back guarantee, pitched in person or by DM to 20 Ostrava SMBs and shop owners.
  - **Pass:** at least 2 paid orders, or at least 3 accepted quotes of 4,000 Kč or more.
  - **Kill:** 0 yeses from 20 pitches.
- Rejected:
  - SaaS lifecycle emails: they sell through pages, and Loops and Sequenzy are already there.
  - Shoptet self-serve: the ESPs give the AI away.
  - Paid MCP server: no paid precedent found.
  - Self-serve audit tool: weak demand. An audit can work as the free way into a conversation.

---

## Changelog

- **2026-04** — Initial doc. Captures the strategy session covering onboarding, paywall placement, ESP landscape, post-generation experience, and build sequencing.
- **2026-04 (revision)** — Killed copy-to-clipboard (chore, not product). Killed teaser/interest-capture interim. Resend integration moved from "deferred until ~50 signups" to "next real build after test-send" — justified by AI-coded development making integration cheap. Paid tier now lives on Resend push, not a future placeholder. Open questions updated to reflect new shape (Resend integration spec, pricing model, second-integration choice).
- **2026-10-16** — Market check (section 11): the URL→sequence moat and the Resend-push paid tier are contradicted by checked sources; proposed a Czech done-for-you service test instead, pending decision.
