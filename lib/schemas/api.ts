import { z } from 'zod'
import { campaignConfigSchema, emailSchema } from './index'
import { landingPageAnalysisSchema } from './analysis'

/**
 * API-specific request/response schemas
 * These are kept separate from domain schemas as they're API contracts
 */

// Generate emails API request
//
// `landingContent` is capped well above what our prompt actually consumes
// (it's truncated to 2_000 chars before being handed to the model) — the cap
// just exists so a malicious payload can't spend memory + Zod cycles parsing
// a megabyte string before we get to the truncation step.
export const generateEmailsRequestSchema = z.object({
  landingUrl: z.string().url().max(2048),
  landingContent: z.string().max(50_000).optional(),
  landingAnalysis: landingPageAnalysisSchema.optional(),
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

/**
 * Exported types
 */

export type GenerateEmailsRequest = z.infer<typeof generateEmailsRequestSchema>
export type ScrapeLandingRequest = z.infer<typeof scrapeLandingRequestSchema>
export type ScrapeLandingResponse = z.infer<typeof scrapeLandingResponseSchema>
export type EnhancedMetadata = z.infer<typeof enhancedMetadataSchema>
export type ScrapeStats = z.infer<typeof scrapeStatsSchema>
export type GenerateEmailsResponse = z.infer<typeof generateEmailsResponseSchema>
