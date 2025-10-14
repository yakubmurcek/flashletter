/**
 * Re-export chat schemas from centralized location
 * This file is kept for backwards compatibility but all schemas
 * are now defined in lib/schemas
 */
export {
  messageSchema,
  campaignContextSchema,
  emailContextSchema,
  selectedContextSchema,
  chatRequestSchema as requestSchema,
  emailEditSchema,
  type Message,
  type CampaignContext,
  type EmailContext,
  type SelectedContext,
  type ChatRequest,
} from '@/lib/schemas'
