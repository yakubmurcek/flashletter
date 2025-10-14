import { z } from 'zod'
import { campaignConfigSchema } from './index'

/**
 * API-specific request/response schemas
 * These are kept separate from domain schemas as they're API contracts
 */

// Generate emails API request
export const generateEmailsRequestSchema = z.object({
  landingUrl: z.string().url(),
  landingContent: z.string().optional(),
  config: campaignConfigSchema,
  campaignId: z.string().uuid().optional(),
})

// Scrape landing page API request
export const scrapeLandingRequestSchema = z.object({
  url: z.string().url(),
})

// Scrape landing page API response
export const scrapeLandingResponseSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string()),
  url: z.string(),
})

/**
 * Exported types
 */

export type GenerateEmailsRequest = z.infer<typeof generateEmailsRequestSchema>
export type ScrapeLandingRequest = z.infer<typeof scrapeLandingRequestSchema>
export type ScrapeLandingResponse = z.infer<typeof scrapeLandingResponseSchema>
