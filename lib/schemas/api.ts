import { z } from 'zod'
import { campaignConfigSchema, emailSchema } from './index'
import { editedLandingPageAnalysisSchema, landingPageAnalysisSchema } from './analysis'

/**
 * API-specific request/response schemas
 * These are kept separate from domain schemas as they're API contracts
 */

// Generate emails API request
//
// `landingContent` is the scraped page as HTML. The prompt cuts it to
// LANDING_PAGE_CONTENT_LIMIT (10k) characters of visible text, which is
// roughly 15-20k characters with markup, so 50k leaves room for link-heavy
// pages. The cap just exists so a malicious payload can't spend memory + Zod
// cycles parsing a megabyte string before we get to the truncation step.
export const generateEmailsRequestSchema = z.object({
  landingUrl: z.string().url().max(2048),
  landingContent: z.string().max(50_000).optional(),
  landingAnalysis: editedLandingPageAnalysisSchema.optional(),
  config: campaignConfigSchema,
  campaignId: z.string().uuid().optional(),
})

// Generate emails API response
export const generateEmailsResponseSchema = z.object({
  emails: z.array(emailSchema),
  warning: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
    })
    .passthrough()
    .optional(),
})

// Scrape landing page API request
export const scrapeLandingRequestSchema = z.object({
  url: z.string().url().max(2048),
  useDynamic: z.boolean().optional().default(false),
})

// Enhanced metadata schema
export const enhancedMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  ogType: z.string().optional(),
  ogUrl: z.string().optional(),
  ogSiteName: z.string().optional(),
  twitterCard: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
  twitterSite: z.string().optional(),
  twitterCreator: z.string().optional(),
  favicon: z.string().optional(),
  structuredData: z.array(z.any()).optional(),
  canonicalUrl: z.string().optional(),
  author: z.string().optional(),
  publishedTime: z.string().optional(),
  modifiedTime: z.string().optional(),
})

// Scrape stats schema
export const scrapeStatsSchema = z.object({
  wordCount: z.number(),
  extractionMethod: z.enum(['static', 'dynamic']),
  cached: z.boolean(),
  loadTime: z.number().optional(),
  finalUrl: z.string().optional(),
})

// Enhanced scrape landing page API response
export const scrapeLandingResponseSchema = z.object({
  content: z.string(),
  metadata: enhancedMetadataSchema,
  url: z.string(),
  stats: scrapeStatsSchema,
  analysis: landingPageAnalysisSchema.optional(),
})

// Send-test-email API
//
// `recipientEmail` is required for anonymous Supabase users (who have no
// auth.users.email yet); for authenticated users we ignore it and send to
// their registered address so a typo in the dialog can't redirect the test.
export const sendTestEmailRequestSchema = z.object({
  campaignId: z.string().uuid(),
  emailDay: z.number().int().min(1).max(30),
  recipientEmail: z.string().email().max(254).optional(),
})

export const sendTestEmailResponseSchema = z.object({
  ok: z.literal(true),
  sentTo: z.string().email(),
  upgradeStarted: z.boolean(),
})

/**
 * Exported types
 */

export type GenerateEmailsRequest = z.infer<typeof generateEmailsRequestSchema>
export type ScrapeLandingRequest = z.infer<typeof scrapeLandingRequestSchema>
export type ScrapeLandingResponse = z.infer<typeof scrapeLandingResponseSchema>
export type EnhancedMetadata = z.infer<typeof enhancedMetadataSchema>
export type ScrapeStats = z.infer<typeof scrapeStatsSchema>
export type GenerateEmailsResponse = z.infer<typeof generateEmailsResponseSchema>
export type SendTestEmailRequest = z.infer<typeof sendTestEmailRequestSchema>
export type SendTestEmailResponse = z.infer<typeof sendTestEmailResponseSchema>
