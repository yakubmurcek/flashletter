import { z } from 'zod'
import { landingPageAnalysisSchema } from './analysis'

/**
 * Core domain schemas
 */

// Email schema
export const emailSchema = z.object({
  id: z.number().int().min(1),
  uuid: z.string().uuid().nullable().optional(),
  day: z.number().int().min(1),
  subject: z.string(),
  preview: z.string().default(''),
  content: z.string(),
})

// Campaign configuration schema
//
// `tone` and `campaignType` are kept as strings rather than enums for now —
// the prompt-builder already falls back to a default when it sees an unknown
// value, and existing DB rows may carry historical labels we don't want to
// reject on load. The .max(64) caps still close the unbounded-string DoS
// vector flagged in the audit.
export const campaignConfigSchema = z.object({
  tone: z.string().max(64),
  campaignType: z.string().max(64),
  days: z.number().min(1).max(30),
})

// Landing page data schema
export const landingPageDataSchema = z.object({
  url: z.string(),
  content: z.string().optional(),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      twitterTitle: z.string().optional(),
      ogSiteName: z.string().optional(),
    })
    .optional(),
  analysis: landingPageAnalysisSchema.optional(),
})

// Campaign schema (from database)
export const campaignSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().nullable(),
  landing_page_url: z.string().nullable(),
  landing_page_content: z.string().nullable(),
  landing_page_metadata: z.any(),
  tone: z.string().nullable(),
  campaign_type: z.string().nullable(),
  days: z.number().nullable(),
  status: z.enum(['draft', 'active', 'completed']),
  created_at: z.string(),
  updated_at: z.string(),
})

// Campaign with emails
export const campaignWithEmailsSchema = campaignSchema.extend({
  emails: z.array(emailSchema),
})

/**
 * Chat/AI related schemas
 */

// Message schema
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

// Email context schema for chat
export const emailContextSchema = z.object({
  subject: z.string().optional(),
  content: z.string().optional(),
  campaignType: z.string().optional(),
})

// Selected text context schema
export const selectedContextSchema = z.object({
  text: z.string(),
  action: z.string(),
})

// Campaign context schema for chat
export const campaignContextSchema = z.object({
  landingPageData: landingPageDataSchema,
  config: campaignConfigSchema,
  allEmails: z.array(emailSchema),
  currentEmailId: z.number(),
})

// Chat request schema
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema),
  campaignContext: campaignContextSchema.optional(),
  emailContext: emailContextSchema.optional(),
  selectedContext: selectedContextSchema.optional().nullable(),
})

// Email edit schema (for AI responses)
export const emailEditSchema = z.object({
  subject: z.string().optional(),
  content: z.string().optional(),
})

/**
 * OpenAI response schemas
 *
 * The AI doesn't see (and shouldn't have to invent) `id` / `uuid` — those are
 * server/database concerns. We use a stripped-down schema for the structured-
 * output call, then map to the full domain `Email` after parsing.
 */

export const aiEmailOutputSchema = z.object({
  day: z.number().int().min(1),
  subject: z.string(),
  preview: z.string().default(''),
  content: z.string(),
})

export const aiEmailsResponseSchema = z.object({
  emails: z.array(aiEmailOutputSchema).min(1),
})

// Backward-compatible alias for any callers that already validate full-shape
// emails (includes id + uuid). Prefer `aiEmailsResponseSchema` for new code.
export const emailsResponseSchema = z.object({
  emails: z.array(emailSchema).min(1),
})

/**
 * Exported types
 */

export type Email = z.infer<typeof emailSchema>
export type CampaignConfig = z.infer<typeof campaignConfigSchema>
export type LandingPageData = z.infer<typeof landingPageDataSchema>
export type { LandingPageAnalysis } from './analysis'
export { landingPageAnalysisSchema } from './analysis'
export type Campaign = z.infer<typeof campaignSchema>
export type CampaignWithEmails = z.infer<typeof campaignWithEmailsSchema>
export type Message = z.infer<typeof messageSchema>
export type EmailContext = z.infer<typeof emailContextSchema>
export type SelectedContext = z.infer<typeof selectedContextSchema>
export type CampaignContext = z.infer<typeof campaignContextSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type EmailEdit = z.infer<typeof emailEditSchema>
export type EmailsResponse = z.infer<typeof emailsResponseSchema>
export type AiEmailOutput = z.infer<typeof aiEmailOutputSchema>
export type AiEmailsResponse = z.infer<typeof aiEmailsResponseSchema>
