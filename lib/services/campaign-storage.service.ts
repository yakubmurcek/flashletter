import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  campaignSchema,
  campaignWithEmailsSchema,
  emailSchema,
  type Campaign,
  type CampaignWithEmails,
  type Email,
  type LandingPageData,
} from '../schemas'

// Re-export for backwards compatibility
export type { Campaign, CampaignWithEmails }

type LandingPageMetadata = LandingPageData['metadata']

const dbEmailRowSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  day: z.number().int().min(1),
  subject: z.string(),
  preview: z.string().nullable(),
  content: z.string(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

type DbEmailRow = z.infer<typeof dbEmailRowSchema>

function mapDbEmailToDomain(email: DbEmailRow): Email {
  return emailSchema.parse({
    id: email.day,
    uuid: email.id,
    day: email.day,
    subject: email.subject,
    preview: email.preview ?? '',
    content: email.content,
  })
}

type CampaignInsertData = {
  name?: string
  landingPageUrl?: string
  landingPageContent?: string
  landingPageMetadata?: LandingPageMetadata
}

type CampaignUpdateData = CampaignInsertData & {
  tone?: string
  campaignType?: string
  days?: number
  status?: 'draft' | 'active' | 'completed'
}

export class CampaignStorageService {
  constructor(private supabase: SupabaseClient) {}

  async createCampaign(
    userId: string,
    data: CampaignInsertData
  ): Promise<Campaign> {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        name: data.name || 'Untitled Campaign',
        landing_page_url: data.landingPageUrl,
        landing_page_content: data.landingPageContent,
        landing_page_metadata: data.landingPageMetadata,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    return campaignSchema.parse(campaign)
  }

  async getCampaign(campaignId: string): Promise<CampaignWithEmails | null> {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .select(
        `
        *,
        emails (
          id,
          campaign_id,
          day,
          subject,
          preview,
          content,
          created_at,
          updated_at
        )
      `
      )
      .eq('id', campaignId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    const parsedCampaign = campaignSchema.parse(campaign)

    const emails: Email[] = (campaign.emails || [])
      .map((email) => mapDbEmailToDomain(dbEmailRowSchema.parse(email)))
      .sort((a: Email, b: Email) => a.day - b.day)

    return campaignWithEmailsSchema.parse({
      ...parsedCampaign,
      emails,
    })
  }

  async updateCampaign(
    campaignId: string,
    data: CampaignUpdateData
  ): Promise<Campaign> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.landingPageUrl !== undefined)
      updateData.landing_page_url = data.landingPageUrl
    if (data.landingPageContent !== undefined)
      updateData.landing_page_content = data.landingPageContent
    if (data.landingPageMetadata !== undefined)
      updateData.landing_page_metadata = data.landingPageMetadata
    if (data.tone !== undefined) updateData.tone = data.tone
    if (data.campaignType !== undefined)
      updateData.campaign_type = data.campaignType
    if (data.days !== undefined) updateData.days = data.days
    if (data.status !== undefined) updateData.status = data.status

    if (Object.keys(updateData).length === 0) {
      const { data: existingCampaign, error: fetchError } = await this.supabase
        .from('campaigns')
        .select()
        .eq('id', campaignId)
        .single()

      if (fetchError) throw fetchError
      return campaignSchema.parse(existingCampaign)
    }

    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) throw error
    return campaignSchema.parse(campaign)
  }

  async listCampaigns(userId: string): Promise<Campaign[]> {
    const { data: campaigns, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (campaigns || []).map((campaign) => campaignSchema.parse(campaign))
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const { error } = await this.supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) throw error
  }

  async saveEmails(campaignId: string, emails: Email[]): Promise<Email[]> {
    // Delete existing emails for this campaign
    const { error: deleteError } = await this.supabase
      .from('emails')
      .delete()
      .eq('campaign_id', campaignId)

    if (deleteError) throw deleteError

    // Insert new emails
    const emailsToInsert = emails.map((email) => ({
      campaign_id: campaignId,
      day: email.day,
      subject: email.subject,
      preview: email.preview,
      content: email.content,
    }))

    const { data, error } = await this.supabase
      .from('emails')
      .insert(emailsToInsert)
      .select()

    if (error) throw error

    return (data || []).map((email) =>
      mapDbEmailToDomain(dbEmailRowSchema.parse(email))
    )
  }

  async updateEmail(
    campaignId: string,
    day: number,
    data: { subject?: string; preview?: string; content?: string }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('emails')
      .update(data)
      .eq('campaign_id', campaignId)
      .eq('day', day)

    if (error) throw error
  }

  async getEmail(campaignId: string, day: number): Promise<Email | null> {
    const { data, error } = await this.supabase
      .from('emails')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('day', day)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return mapDbEmailToDomain(dbEmailRowSchema.parse(data))
  }
}
