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
      'Objections or concerns the page pre-addresses (via FAQ, testimonials, guarantees, comparisons). Emails will echo these to lower reader resistance. Empty array if none detected.',
    ),
  proofPoints: z
    .array(z.string())
    .describe(
      'Specific, concrete proof on the page — numbers, named customers, quotes, stats, certifications. NOT vague claims. Emails cite these verbatim instead of making up stats. Example: ["Used by 1,200+ founders", "Ingrid B. quote: `Saved me 6 hours/week`", "SOC 2 certified"]. Empty array if none.',
    ),
  angles: z
    .array(z.string())
    .describe(
      'Distinct selling angles the page leans on (time saved, money made, status, ease, specific feature benefit). The email sequence uses these to vary messaging email-to-email instead of hammering one angle. Return at least 2 if possible.',
    ),
  opportunities: z
    .array(z.string())
    .describe(
      'Things the landing page does NOT address that emails could fill. Gaps the reader might have after reading the page. Example: "Page doesn\'t mention pricing — email day 3 should address cost expectations." Empty array if the page is exhaustive.',
    ),
})

export type LandingPageAnalysis = z.infer<typeof landingPageAnalysisSchema>

export const landingPageAnalysisOptionalSchema = landingPageAnalysisSchema.partial()
