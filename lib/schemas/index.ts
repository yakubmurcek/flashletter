import { z } from 'zod'

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
export const campaignConfigSchema = z.object({
  tone: z.string(),
  campaignType: z.string(),
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
    })
    .optional(),
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
 */

// Email generation response from OpenAI
export const emailsResponseSchema = z.object({
  emails: z.array(emailSchema).min(1),
})

/**
 * Exported types
 */

export type Email = z.infer<typeof emailSchema>
export type CampaignConfig = z.infer<typeof campaignConfigSchema>
export type LandingPageData = z.infer<typeof landingPageDataSchema>
export type Campaign = z.infer<typeof campaignSchema>
export type CampaignWithEmails = z.infer<typeof campaignWithEmailsSchema>
export type Message = z.infer<typeof messageSchema>
export type EmailContext = z.infer<typeof emailContextSchema>
export type SelectedContext = z.infer<typeof selectedContextSchema>
export type CampaignContext = z.infer<typeof campaignContextSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type EmailEdit = z.infer<typeof emailEditSchema>
export type EmailsResponse = z.infer<typeof emailsResponseSchema>
