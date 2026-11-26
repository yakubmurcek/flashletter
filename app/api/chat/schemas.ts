/**
 * Re-export chat schemas from centralized location
 * This file is kept for backwards compatibility but all schemas
 * are now defined in lib/schemas
 */
export {
  chatRequestSchema as requestSchema,
  type CampaignContext,
  type EmailContext,
  type SelectedContext,
} from '@/lib/schemas'
