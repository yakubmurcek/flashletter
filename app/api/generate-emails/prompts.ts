import type { LandingPageAnalysis } from '@/lib/schemas/analysis'
import { truncateContentByTextLength } from '@/lib/utils/scraper'
import { LANDING_PAGE_CONTENT_LIMIT } from '@/lib/constants/app'

/**
 * Email Generation Prompts
 *
 * Large prompt templates moved here to reduce webpack cache warnings
 */

/**
 * Spreads days `first`..`last` over the phases in order, as evenly as possible.
 * A phase that gets no days at this length is left out, so short sequences
 * never print an empty range like "Days 2-1".
 */
function spreadDays(first: number, last: number, phases: string[]): string[] {
  const span = last - first + 1
  const lines: string[] = []
  phases.forEach((text, i) => {
    const from = first + Math.round((i * span) / phases.length)
    const to = first - 1 + Math.round(((i + 1) * span) / phases.length)
    if (from > to) return
    lines.push(`${from === to ? `Day ${from}` : `Days ${from}-${to}`}: ${text}`)
  })
  return lines
}

/** Day 1, the middle phases spread over the days between, then the last day. */
function plan(days: number, opening: string, middle: string[], closing?: string): string {
  const lines = [`Day 1: ${opening}`]
  if (closing && days > 1) {
    lines.push(...spreadDays(2, days - 1, middle), `Day ${days}: ${closing}`)
  } else {
    lines.push(...spreadDays(2, days, middle))
  }
  return `\n${lines.join('\n')}`
}

export function getCampaignStructure(type: string, days: number): string {
  const structures = {
    nurture: () =>
      plan(
        days,
        'Welcome & Introduction',
        [
          'Value-building content, educational resources',
          "Social proof and success stories if the page has real proof; otherwise a concrete use case built from the page's own features and examples",
        ],
        'Strong call-to-action',
      ),

    onboarding: () =>
      plan(days, 'Warm welcome, set expectations', [
        'Getting started guide, basic features',
        'Advanced features, pro tips',
        'Completion celebration, next steps',
      ]),

    promotional: () =>
      plan(
        days,
        'Introduce offer, create awareness',
        [
          'Build urgency, showcase benefits',
          'Overcome objections, testimonials (only real ones from the page)',
        ],
        'Final push, last chance messaging',
      ),

    educational: () =>
      plan(
        days,
        'What the reader will learn in this series and why it matters to them',
        [
          "One core lesson per email, each grounded in a concrete example from the page's own features",
          'Putting it into practice: common mistakes and a short worked example',
        ],
        'Recap the key lessons and point to the next step with the product',
      ),

    're-engagement': () =>
      plan(
        days,
        'A friendly check-in: remind them what they signed up for and what they are missing',
        [
          'What is new or better since they last looked (only what the page shows)',
          'One quick win they can get in a few minutes',
        ],
        'Last call: one clear reason to come back now',
      ),
  } satisfies Record<string, () => string>

  const build: (() => string) | undefined = structures[type as keyof typeof structures]
  return (build ?? structures.nurture)()
}

export function getToneGuidelines(tone: string): string {
  const tones = {
    professional: 'Formal language, clear and direct, industry expertise, authoritative',
    formal:
      'Strictly business, precise and serious: complete sentences, no slang, no exclamation points, measured claims',
    friendly: 'Conversational, warm, approachable, use "you" and "we", casual but respectful',
    enthusiastic: 'Energetic, exciting, use exclamation points (moderately), positive language',
    casual: 'Relaxed, informal, conversational, relatable, down-to-earth',
  } satisfies Record<string, string>

  const guideline: string | undefined = tones[tone as keyof typeof tones]
  return guideline || tones.friendly
}

function formatList(items: string[] | undefined, prefix: string, emptyNote: string): string {
  if (!items || items.length === 0) return `${prefix}: ${emptyNote}`
  return `${prefix}:\n${items.map((item) => `- ${item}`).join('\n')}`
}

// The user can clear any analysis field on /create/configure.
const orInfer = (value: string) => value.trim() || 'Not given; infer it from the page content.'

function buildAnalysisBlock(analysis: LandingPageAnalysis | undefined): string {
  if (!analysis) return ''

  return `
LANDING PAGE ANALYSIS (use this directly in the copy — do not ignore):

Value proposition: ${orInfer(analysis.valueProp)}
Target audience: ${orInfer(analysis.targetAudience)}
Primary CTA (every email must drive toward this same action): ${orInfer(analysis.primaryCTA)}
Voice fingerprint to match: ${orInfer(analysis.toneFingerprint)}

${formatList(analysis.proofPoints, 'Proof points (cite these verbatim — do NOT fabricate numbers or customer names)', 'No concrete proof on the page. Do NOT invent stats or testimonials.')}

${formatList(analysis.objections, 'Objections the page pre-addresses (echo these in the sequence to lower resistance)', 'None detected.')}

${formatList(analysis.angles, 'Distinct selling angles (vary these across emails — do not repeat the same angle)', 'Use your judgement but vary the angle across emails.')}

${formatList(analysis.opportunities, 'Gaps the email sequence should fill (things the page does NOT address)', 'None.')}

Rules derived from the analysis:
- Every subject line + CTA in the sequence must be consistent with the primary CTA.
- Match the voice fingerprint exactly — pronouns, sentence length, jargon level, formality.
- Cite proof points verbatim. If no proof exists, do NOT make any up; lean on specifics from the content instead.
- Rotate through the distinct angles — do not ship 5 emails that all hit the same benefit.
- Fill a gap only when the page content gives you real material for it. Never write an email whose point is "we can't say, check the site" (e.g. about pricing the page doesn't state).`
}

// The whole scraped page (the scraper already caps it at this much visible
// text), counted in text rather than markup. The writer keeps the HTML so it
// can see the page's real links for the call to action.
const LANDING_CONTENT_LIMIT = LANDING_PAGE_CONTENT_LIMIT

function landingContentBlock(landingContent?: string): string {
  return landingContent
    ? `Landing Page Content:\n${truncateContentByTextLength(landingContent, LANDING_CONTENT_LIMIT)}`
    : ''
}

/**
 * Craft rules shared by every generation prompt. They exist because without
 * them the model wrote choppy one-line fragments ("Day 3. Cost."), talked about
 * the sequence itself, and filled gaps with "check the site" non-content.
 */
function writingRules(landingUrl: string): string {
  return `How to write each email:
- Write like a real person at the company writing to one subscriber: plain, specific, human. Every email has one idea and earns its place with something concrete from the page (a feature, an example, a number, a quote).
- 120-200 words of body. Paragraphs of 1-3 full sentences. No telegraphic fragments ("Day 3. Cost." / "Fair."), no one-word paragraphs.
- Never mention day numbers, "this sequence", "this email series", or preview or recap other emails ("over the next few days", "over the past few days").
- The copy is what the subscriber reads, so it never talks about what the page lacks, what you can't or won't claim, or these instructions. If there is no proof, simply write about what is there.
- Write every word in the language of the landing page, including the greeting, the call to action and the sign-off.
- Open with a short greeting line (in English "Hi," or "Hey,"), then make the point in the first sentence. Do not open with "Welcome. We're glad you're here." or similar filler.
- Use at most one subheading per email, and only if it genuinely helps scanning. Use a bullet list only for 3+ concrete items.
- End with exactly one call to action as a Markdown link to ${landingUrl} (or a deeper page on the same site that the content names), with action text that names the action, such as "[Create your first project](${landingUrl})". Never a bare URL, never "click here". Every link is a full URL starting with http:// or https://, never a relative path like /register or #pricing (it breaks once the email is sent).
- Sign off on its own line with the product's real name, in the form "The <product name> team" (translated for other languages, e.g. "Tým Fakturoid").
- Subject lines: specific and curiosity-driven, under 60 characters, no clickbait, no ALL CAPS. At most one emoji per email, and only if the page's own voice uses them.
- No em dashes (—). Use commas, periods, colons or parentheses instead.
- Banned phrases: "game-changer", "unlock", "supercharge", "elevate", "seamless", "in today's fast-paced world", "we're thrilled", "look no further", "take it to the next level".`
}

export function buildInstructions(
  config: { days: number; campaignType: string; tone: string },
  landingUrl: string,
  landingContent?: string,
  analysis?: LandingPageAnalysis,
): string {
  const analysisBlock = buildAnalysisBlock(analysis)

  return `You are an expert email marketing copywriter. Generate a ${
    config.days
  }-day ${config.campaignType} email campaign with a ${config.tone} tone.

Landing Page URL: ${landingUrl}
${landingContentBlock(landingContent)}
${analysisBlock}

For each email, provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Email campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone} (apply in addition to the voice fingerprint above if analysis is present):
${getToneGuidelines(config.tone)}

${writingRules(landingUrl)}

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "emails": [
    {
      "day": 1,
      "subject": "...",
      "preview": "...",
      "content": "..."
    }
  ]
}

Do NOT invent statistics, testimonials, or customer names that are not provided in the proof points. Ground concrete claims in the proof points only. Generic claims without proof should be phrased generally (no made-up numbers).`
}

export function buildFirstEmailInstructions(
  config: { days: number; campaignType: string; tone: string },
  landingUrl: string,
  landingContent?: string,
  analysis?: LandingPageAnalysis,
): string {
  const analysisBlock = buildAnalysisBlock(analysis)

  return `You are an expert email marketing copywriter. You are writing **only Day 1** of a ${
    config.days
  }-day ${config.campaignType} email campaign with a ${config.tone} tone. Days 2-${
    config.days
  } will be generated next, so day 1 must set the hook for the rest of the sequence.

Landing Page URL: ${landingUrl}
${landingContentBlock(landingContent)}
${analysisBlock}

Provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Day 1 should match the opening of this campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone} (apply in addition to the voice fingerprint above if analysis is present):
${getToneGuidelines(config.tone)}

${writingRules(landingUrl)}

IMPORTANT: Return ONLY valid JSON with this exact structure (a single-element array):
{
  "emails": [
    { "day": 1, "subject": "...", "preview": "...", "content": "..." }
  ]
}

Do NOT invent statistics, testimonials, or customer names. Ground concrete claims in the proof points only.`
}

export function buildRemainingEmailsInstructions(
  config: { days: number; campaignType: string; tone: string },
  landingUrl: string,
  firstEmail: { subject: string; preview: string; content: string },
  landingContent?: string,
  analysis?: LandingPageAnalysis,
  range: { from: number; to: number } = { from: 2, to: config.days },
): string {
  const analysisBlock = buildAnalysisBlock(analysis)
  const { from, to } = range
  const count = to - from + 1
  const partial = from !== 2 || to !== config.days

  return `You are an expert email marketing copywriter. Day 1 of a ${
    config.days
  }-day ${config.campaignType} email campaign (${
    config.tone
  } tone) has already been written. Generate **Days ${from} through ${to}** so they form a coherent sequence with Day 1 — do not repeat its hook, voice should match, escalate the narrative.${
    partial
      ? ` The other days of the sequence are written separately: write only these ${count}, each true to its place in the structure below.`
      : ''
  }

Landing Page URL: ${landingUrl}
${landingContentBlock(landingContent)}
${analysisBlock}

Day 1 (already written, for reference — do NOT regenerate it):
Subject: ${firstEmail.subject}
Preview: ${firstEmail.preview}
Body:
${firstEmail.content}

For each remaining day, provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Email campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone} (apply in addition to the voice fingerprint above if analysis is present):
${getToneGuidelines(config.tone)}

${writingRules(landingUrl)}

IMPORTANT: Return ONLY valid JSON with this exact structure — exactly ${count} emails, days ${from} through ${to} in order:
{
  "emails": [
    { "day": ${from}, "subject": "...", "preview": "...", "content": "..." },
    ...
    { "day": ${to}, "subject": "...", "preview": "...", "content": "..." }
  ]
}

Do NOT invent statistics, testimonials, or customer names. Ground concrete claims in the proof points only.`
}
