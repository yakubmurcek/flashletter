import type { SupabaseClient } from '@supabase/supabase-js'
import type { Campaign, CampaignWithEmails, Email } from '../schemas'

// Re-export for backwards compatibility
export type { Campaign, CampaignWithEmails }

export class CampaignStorageService {
  constructor(private supabase: SupabaseClient) {}

  async createCampaign(
    userId: string,
    data: {
      name?: string
      landingPageUrl?: string
      landingPageContent?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landingPageMetadata?: any
    }
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
    return campaign
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

    // Transform the data to match our Email type and sort by day
    const emails: Email[] = (campaign.emails || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((email: any) => ({
        id: email.day, // Use day as numeric id for backwards compatibility
        uuid: email.id, // Include the actual UUID from database
        day: email.day,
        subject: email.subject,
        preview: email.preview || '',
        content: email.content,
      }))
      .sort((a: Email, b: Email) => a.day - b.day) // Sort by day in ascending order

    return {
      ...campaign,
      emails,
    }
  }

  async updateCampaign(
    campaignId: string,
    data: {
      name?: string
      landingPageUrl?: string
      landingPageContent?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      landingPageMetadata?: any
      tone?: string
      campaignType?: string
      days?: number
      status?: 'draft' | 'active' | 'completed'
    }
  ): Promise<Campaign> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

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

    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) throw error
    return campaign
  }

  async listCampaigns(userId: string): Promise<Campaign[]> {
    const { data: campaigns, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return campaigns || []
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
    await this.supabase.from('emails').delete().eq('campaign_id', campaignId)

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

    // Transform the returned data to match our Email type with UUIDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((email: any) => ({
      id: email.day, // Use day as numeric id for backwards compatibility
      uuid: email.id, // Include the actual UUID from database
      day: email.day,
      subject: email.subject,
      preview: email.preview || '',
      content: email.content,
    }))
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

    return {
      id: data.day,
      uuid: data.id,
      day: data.day,
      subject: data.subject,
      preview: data.preview || '',
      content: data.content,
    }
  }
}
