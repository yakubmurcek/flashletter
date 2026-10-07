import type { LandingPageAnalysis } from '@/lib/schemas/analysis'

/**
 * Email Generation Prompts
 *
 * Large prompt templates moved here to reduce webpack cache warnings
 */

export function getCampaignStructure(type: string, days: number): string {
  const structures: Record<string, string> = {
    nurture: `
Day 1: Welcome & Introduction
Days 2-${Math.floor(days / 2)}: Value-building content, educational resources
Days ${Math.floor(days / 2) + 1}-${days - 1}: Social proof and success stories if the page has real proof; otherwise a concrete use case built from the page's own features and examples
Day ${days}: Strong call-to-action`,

    onboarding: `
Day 1: Warm welcome, set expectations
Days 2-${Math.floor(days / 3)}: Getting started guide, basic features
Days ${Math.floor(days / 3) + 1}-${Math.floor((2 * days) / 3)}: Advanced features, pro tips
Days ${Math.floor((2 * days) / 3) + 1}-${days}: Completion celebration, next steps`,

    promotional: `
Day 1: Introduce offer, create awareness
Days 2-${Math.floor(days / 2)}: Build urgency, showcase benefits
Days ${Math.floor(days / 2) + 1}-${days - 1}: Overcome objections, testimonials (only real ones from the page)
Day ${days}: Final push, last chance messaging`,
  }

  return structures[type] || structures.nurture
}

export function getToneGuidelines(tone: string): string {
  const tones: Record<string, string> = {
    professional: 'Formal language, clear and direct, industry expertise, authoritative',
    friendly: 'Conversational, warm, approachable, use "you" and "we", casual but respectful',
    enthusiastic: 'Energetic, exciting, use exclamation points (moderately), positive language',
    casual: 'Relaxed, informal, conversational, relatable, down-to-earth',
  }

  return tones[tone] || tones.friendly
}

function formatList(items: string[] | undefined, prefix: string, emptyNote: string): string {
  if (!items || items.length === 0) return `${prefix}: ${emptyNote}`
  return `${prefix}:\n${items.map((item) => `- ${item}`).join('\n')}`
}

function buildAnalysisBlock(analysis: LandingPageAnalysis | undefined): string {
  if (!analysis) return ''

  return `
LANDING PAGE ANALYSIS (use this directly in the copy — do not ignore):

Value proposition: ${analysis.valueProp}
Target audience: ${analysis.targetAudience}
Primary CTA (every email must drive toward this same action): ${analysis.primaryCTA}
Voice fingerprint to match: ${analysis.toneFingerprint}

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

// Landing content sent to the writer; the analysis already distilled the rest.
const LANDING_CONTENT_LIMIT = 6000

function landingContentBlock(landingContent?: string): string {
  return landingContent
    ? `Landing Page Content:\n${landingContent.substring(0, LANDING_CONTENT_LIMIT)}`
    : ''
}

/**
 * Craft rules shared by every generation prompt. They exist because without
 * them the model wrote choppy one-line fragments ("Day 3. Cost."), talked about
 * the sequence itself, and filled gaps with "check the site" non-content.
 */
function writingRules(landingUrl: string): string {
  return `How to write each email:
- Write like the founder writing to one subscriber: plain, specific, human. Every email has one idea and earns its place with something concrete from the page (a feature, an example, a number, a quote).
- 120-200 words of body. Paragraphs of 1-3 full sentences. No telegraphic fragments ("Day 3. Cost." / "Fair."), no one-word paragraphs.
- Never mention day numbers, "this sequence", "this email series", or what the next email will cover.
- Open with a short greeting line ("Hi," or "Hey,"), then make the point in the first sentence. Do not open with "Welcome. We're glad you're here." or similar filler.
- Use at most one subheading per email, and only if it genuinely helps scanning. Use a bullet list only for 3+ concrete items.
- End with exactly one call to action as a Markdown link to ${landingUrl} (or a deeper page on the same site that the content names), with action text that names the action, such as "[Create your first project](${landingUrl})". Never a bare URL, never "click here".
- Sign off with the product's real name, in the form "— The <product name> team".
- Subject lines: specific and curiosity-driven, under 60 characters, no clickbait, no ALL CAPS, at most one emoji across the whole sequence.
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
): string {
  const analysisBlock = buildAnalysisBlock(analysis)

  return `You are an expert email marketing copywriter. Day 1 of a ${
    config.days
  }-day ${config.campaignType} email campaign (${
    config.tone
  } tone) has already been written. Generate **Days 2 through ${config.days}** so they form a coherent sequence with Day 1 — do not repeat its hook, voice should match, escalate the narrative.

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

IMPORTANT: Return ONLY valid JSON with this exact structure — exactly ${
    config.days - 1
  } emails, days 2 through ${config.days} in order:
{
  "emails": [
    { "day": 2, "subject": "...", "preview": "...", "content": "..." },
    ...
    { "day": ${config.days}, "subject": "...", "preview": "...", "content": "..." }
  ]
}

Do NOT invent statistics, testimonials, or customer names. Ground concrete claims in the proof points only.`
}
