import { z } from 'zod'

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

export const campaignContextSchema = z.object({
  landingPageData: z.object({
    url: z.string(),
    content: z.string().optional(),
    metadata: z.any().optional(),
  }),
  config: z.object({
    tone: z.string(),
    campaignType: z.string(),
    days: z.number(),
  }),
  allEmails: z.array(
    z.object({
      id: z.number(),
      day: z.number(),
      subject: z.string(),
      preview: z.string(),
      content: z.string(),
    })
  ),
  currentEmailId: z.number(),
})

export const emailContextSchema = z.object({
  subject: z.string().optional(),
  content: z.string().optional(),
  campaignType: z.string().optional(),
})

export const selectedContextSchema = z.object({
  text: z.string(),
  action: z.string(),
})

export const requestSchema = z.object({
  messages: z.array(messageSchema),
  campaignContext: campaignContextSchema.optional(),
  emailContext: emailContextSchema.optional(),
  selectedContext: selectedContextSchema.optional().nullable(),
})

export const emailEditSchema = z.object({
  subject: z.string().optional(),
  content: z.string().optional(),
})

export type Message = z.infer<typeof messageSchema>
export type CampaignContext = z.infer<typeof campaignContextSchema>
export type EmailContext = z.infer<typeof emailContextSchema>
export type SelectedContext = z.infer<typeof selectedContextSchema>
export type ChatRequest = z.infer<typeof requestSchema>
