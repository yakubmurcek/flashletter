export interface Email {
  id: number
  day: number
  subject: string
  preview: string
  content: string
}

export interface CampaignConfig {
  tone: string
  campaignType: string
  days: number
}

export interface LandingPageData {
  url: string
  content?: string
  metadata?: {
    title?: string
    description?: string
    ogTitle?: string
    ogDescription?: string
  }
}

export interface SelectedContext {
  text: string
  action: string
}

export interface EmailVersion {
  id: string // timestamp-based unique identifier
  emailId: number // reference to parent email
  subject: string
  content: string
  timestamp: number // Unix timestamp
  changesSummary: string // e.g., "Subject and 3 lines changed"
}
