/**
 * Core types for the application
 * Most types are now generated from Zod schemas for type safety
 */

// Re-export types from schemas (schema-generated for validation)
export type { Email, CampaignConfig, LandingPageData, SelectedContext } from './schemas'

export type { GenerateEmailsResponse } from './schemas/api'

// Types without schemas (UI-specific, not validated)
export interface EmailVersion {
  id: string // timestamp-based unique identifier
  emailId: number // reference to parent email
  subject: string
  content: string
  timestamp: number // Unix timestamp
  changesSummary: string // e.g., "Subject and 3 lines changed"
}

export interface FullCampaignContext {
  landingPageData: LandingPageData
  config: CampaignConfig
  allEmails: Email[]
  currentEmailId: number
}

// Re-export for convenience (FullCampaignContext is same as CampaignContext)
// Note: FullCampaignContext is kept for backwards compatibility
import type { Email, CampaignConfig, LandingPageData } from './schemas'
