import { zodTextFormat } from 'openai/helpers/zod'
import { openai } from '@/lib/openai'
import { retryWithBackoff } from '@/lib/utils/openai-retry'
import { landingPageAnalysisSchema, type LandingPageAnalysis } from '@/lib/schemas/analysis'
import type { ExtractedMetadata } from '@/lib/utils/metadata-extractor'

const ANALYSIS_CONTENT_LIMIT = 8000

const SYSTEM_INSTRUCTIONS = `You analyze landing pages to power cold-email and newsletter copy that actually converts.

You are reading a real landing page a founder is about to build a 5-10 email sequence from. Your output will be fed directly into the email generator and shown to the founder as an editable preview. Be specific, ground every field in the page content, and never invent facts that aren't in the source.

Rules:
- Use the page's own words and examples where possible — verbatim numbers, named customers, direct quotes.
- If a field has no basis in the page, return an empty array (or a one-sentence flag for text fields like valueProp, never an empty string for the required text fields).
- Proof points must be concrete (numbers, names, specific outcomes). If the page only says "trusted by many" — that is NOT a proof point, it is a gap; list it under opportunities instead.
- Objections are things the page pre-addresses, not objections you imagine. Look at FAQs, guarantees, comparison tables, testimonials phrased as "I was skeptical but...".
- Angles are distinct selling dimensions (time, money, status, ease, risk-reduction, specific feature). Return at least 2 so the email sequence has variation.
- Tone fingerprint must be descriptive, not a label. Describe pronouns, sentence length, jargon level, humor, formality — enough that a copywriter could match voice from your description alone.
- The target audience should be specific enough that the reader either thinks "yes that's me" or "no that's not me" — not generic ("business owners").`

interface AnalyzeLandingPageInput {
  url: string
  content: string
  metadata: ExtractedMetadata
}

export async function analyzeLandingPage(
  input: AnalyzeLandingPageInput,
): Promise<LandingPageAnalysis> {
  const truncatedContent = input.content.slice(0, ANALYSIS_CONTENT_LIMIT)
  const title = input.metadata.ogTitle || input.metadata.title || 'Untitled page'
  const description = input.metadata.ogDescription || input.metadata.description || ''
  const siteName = input.metadata.ogSiteName || ''

  const userInput = `URL: ${input.url}
Title: ${title}
${siteName ? `Site: ${siteName}\n` : ''}${description ? `Description: ${description}\n` : ''}
Landing page content (extracted):
"""
${truncatedContent}
"""

Analyze this page for email-campaign copywriting. Return structured JSON matching the schema.`

  const response = await retryWithBackoff(() =>
    openai.responses.parse({
      model: 'gpt-5-mini',
      input: [
        { role: 'system', content: SYSTEM_INSTRUCTIONS },
        { role: 'user', content: userInput },
      ],
      temperature: 0.2,
      text: {
        format: zodTextFormat(landingPageAnalysisSchema, 'landing_page_analysis'),
      },
    }),
  )

  const parsed = response.output_parsed
  if (!parsed) {
    throw new Error('No analysis returned from OpenAI')
  }

  return parsed
}
