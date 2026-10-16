import { z } from 'zod'

export const landingPageAnalysisSchema = z.object({
  valueProp: z
    .string()
    .trim()
    .min(1)
    .describe(
      'One sentence describing what the product does and for whom. Specific, not marketing fluff. Example: "Helps solo SaaS founders turn their landing page into a full email onboarding sequence without writing copy."',
    ),
  targetAudience: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Who the page is written for, in concrete terms. Role, company size, context. Example: "Bootstrapped B2B SaaS founders with under 100 paying customers who hate writing marketing copy."',
    ),
  primaryCTA: z
    .string()
    .trim()
    .min(1)
    .describe(
      'The single primary action the page wants visitors to take. Every email in the generated sequence must drive toward this same action. Example: "Start free trial" or "Book a 15-min demo".',
    ),
  toneFingerprint: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Concrete description of the page voice so emails match. Avoid labels like "friendly". Describe the actual patterns. Example: "Direct, casual, uses \'you\' heavily, no jargon, short sentences, occasional dry humor."',
    ),
  objections: z
    .array(z.string())
    .describe(
      'Objections or concerns the page pre-addresses (via FAQ, testimonials, guarantees, comparisons). Emails will echo these to lower reader resistance. At most 4 items, each under 20 words. Empty array if none detected.',
    ),
  proofPoints: z
    .array(z.string())
    .describe(
      'Specific, concrete proof on the page — numbers, named customers, quotes, stats, certifications. NOT vague claims. Emails cite these verbatim instead of making up stats. At most 6 items, the strongest first; quotes verbatim but trimmed to one sentence. Example: ["Used by 1,200+ founders", "Ingrid B. quote: `Saved me 6 hours/week`", "SOC 2 certified"]. Empty array if none.',
    ),
  angles: z
    .array(z.string())
    .describe(
      'Distinct selling angles the page leans on (time saved, money made, status, ease, specific feature benefit). The email sequence uses these to vary messaging email-to-email instead of hammering one angle. 2 to 5 items, each under 15 words.',
    ),
  opportunities: z
    .array(z.string())
    .describe(
      'Questions a reader may still have that an email can answer using what the page does say (e.g. how setup works, who it is not for). Not facts the page lacks, such as unstated prices. At most 3 items, each under 20 words. Empty array if none.',
    ),
})

export type LandingPageAnalysis = z.infer<typeof landingPageAnalysisSchema>

/**
 * The analysis as the user may have edited it on /create/configure: any text
 * field can be cleared and list items can be blank. Used wherever an edited
 * analysis comes back in (generation requests, stored campaigns) so one
 * cleared field never turns every later generation into a 400.
 */
export const editedLandingPageAnalysisSchema = z.object({
  valueProp: z.string().trim(),
  targetAudience: z.string().trim(),
  primaryCTA: z.string().trim(),
  toneFingerprint: z.string().trim(),
  objections: z.array(z.string()).transform(dropBlank),
  proofPoints: z.array(z.string()).transform(dropBlank),
  angles: z.array(z.string()).transform(dropBlank),
  opportunities: z.array(z.string()).transform(dropBlank),
})

function dropBlank(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean)
}

export const landingPageAnalysisOptionalSchema = landingPageAnalysisSchema.partial()
