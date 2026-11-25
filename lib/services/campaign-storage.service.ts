import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  campaignSchema,
  campaignWithEmailsSchema,
  emailSchema,
  type Campaign,
  type CampaignWithEmails,
  type Email,
} from '../schemas'

// Re-export for backwards compatibility
export type { Campaign, CampaignWithEmails }

/**
 * `landing_page_metadata` is a jsonb column — it holds both the scraped OG metadata
 * and the AI-generated `analysis` under an `analysis` key. Keep this type permissive.
 */
type LandingPageMetadata = Record<string, unknown>

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

/**
 * An edit hit no saved email: the email was shown but never reached the
 * database (e.g. generation failed before saving it). Callers match on
 * `name`, so mocks of this module don't need to export the class.
 */
export class EmailNotSavedError extends Error {
  constructor(day: number) {
    super(`Day ${day} is not saved yet, so this edit was not kept.`)
    this.name = 'EmailNotSavedError'
  }
}

export class CampaignStorageService {
  constructor(private supabase: SupabaseClient) {}

  async createCampaign(userId: string, data: CampaignInsertData): Promise<Campaign> {
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
      `,
      )
      .eq('id', campaignId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    const parsedCampaign = campaignSchema.parse(campaign)

    const emails: Email[] = (campaign.emails || [])
      .map((email: unknown) => mapDbEmailToDomain(dbEmailRowSchema.parse(email)))
      .sort((a: Email, b: Email) => a.day - b.day)

    return campaignWithEmailsSchema.parse({
      ...parsedCampaign,
      emails,
    })
  }

  async updateCampaign(campaignId: string, data: CampaignUpdateData): Promise<Campaign> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.landingPageUrl !== undefined) updateData.landing_page_url = data.landingPageUrl
    if (data.landingPageContent !== undefined)
      updateData.landing_page_content = data.landingPageContent
    if (data.landingPageMetadata !== undefined)
      updateData.landing_page_metadata = data.landingPageMetadata
    if (data.tone !== undefined) updateData.tone = data.tone
    if (data.campaignType !== undefined) updateData.campaign_type = data.campaignType
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
    const { error } = await this.supabase.from('campaigns').delete().eq('id', campaignId)

    if (error) throw error
  }

  /**
   * Verify the given user owns the campaign. Returns true on match, false on
   * mismatch or not-found. Used as defence-in-depth on routes that mutate
   * campaign data — RLS should already cover this, but the application-layer
   * check makes mis-configured RLS surface as a 403 instead of a silent wipe.
   */
  async isOwnedBy(campaignId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (error) throw error
    if (!data) return false
    return data.user_id === userId
  }

  private async readEmailIdsByDay(campaignId: string) {
    const { data: existingRows, error: readError } = await this.supabase
      .from('emails')
      .select('id, day')
      .eq('campaign_id', campaignId)

    if (readError) throw readError
    return (existingRows ?? []) as Array<{ id: string; day: number }>
  }

  /** Update each email in place by day, insert the missing ones. */
  private async writeEmails(
    campaignId: string,
    emails: Email[],
    existingRows: Array<{ id: string; day: number }>,
  ): Promise<Email[]> {
    const existingIdByDay = new Map<number, string>()
    for (const row of existingRows) {
      existingIdByDay.set(row.day, row.id)
    }

    const result: Email[] = []

    for (const email of emails) {
      const existingId = existingIdByDay.get(email.day)
      const payload = {
        day: email.day,
        subject: email.subject,
        preview: email.preview,
        content: email.content,
      }

      if (existingId) {
        const { data, error } = await this.supabase
          .from('emails')
          .update(payload)
          .eq('id', existingId)
          .select()
          .single()
        if (error) throw error
        result.push(mapDbEmailToDomain(dbEmailRowSchema.parse(data)))
        this.supabase.from('campaigns').update({ updated_at: new Date().toISOString() }).eq('id', campaignId)
      } else {
        const { data, error } = await this.supabase
          .from('emails')
          .insert({ ...payload, campaign_id: campaignId })
          .select()
          .single()
        if (error) throw error
        result.push(mapDbEmailToDomain(dbEmailRowSchema.parse(data)))
      }
    }

    return result.sort((a, b) => a.day - b.day)
  }

  async saveEmails(campaignId: string, emails: Email[]): Promise<Email[]> {
    // Preserve email UUIDs across re-saves so `email_versions.email_id` (and
    // any other FKs) stay valid. The previous delete-then-insert pattern
    // minted fresh UUIDs every time, which silently orphaned (or, with
    // ON DELETE CASCADE, wiped) the entire version history on every regen.
    //
    // Strategy: read existing rows by (campaign_id, day), update in place
    // when the day matches an existing row, insert when it's new, and only
    // delete rows whose day is no longer present (e.g. user shrank the
    // sequence from 7 → 3).
    const existingRows = await this.readEmailIdsByDay(campaignId)
    const result = await this.writeEmails(campaignId, emails, existingRows)

    // NOTE on FK behavior: this DELETE assumes `email_versions.email_id` has
    // ON DELETE CASCADE — versions of removed days are dropped along with
    // their email. That matches user intent (the user shrank the campaign,
    // they no longer want history for the removed days), and matches the
    // pre-fix behavior (which did `DELETE FROM emails WHERE campaign_id = $1`
    // on every save). If the FK is RESTRICT, this DELETE will throw — which
    // would also have broken the previous code path on every save.
    const incomingDays = new Set(emails.map((e) => e.day))
    const idsToDelete = existingRows
      .filter((row) => !incomingDays.has(row.day))
      .map((row) => row.id)
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await this.supabase
        .from('emails')
        .delete()
        .in('id', idsToDelete)
      if (deleteError) throw deleteError
    }

    return result
  }

  /**
   * Save these days (update in place by day, insert if missing) and leave
   * every other day alone. Used to save emails one step at a time while a
   * sequence streams in; `deleteEmailsAfterDay` trims the rest once the
   * final length is known.
   */
  async upsertEmails(campaignId: string, emails: Email[]): Promise<Email[]> {
    const existingRows = await this.readEmailIdsByDay(campaignId)
    return this.writeEmails(campaignId, emails, existingRows)
  }

  /** Drop the days after `lastDay` (and, by cascade, their versions). */
  async deleteEmailsAfterDay(campaignId: string, lastDay: number): Promise<void> {
    const { error } = await this.supabase
      .from('emails')
      .delete()
      .eq('campaign_id', campaignId)
      .gt('day', lastDay)

    if (error) throw error
  }

  /** Throws `EmailNotSavedError` when no saved email has this day. */
  async updateEmail(
    campaignId: string,
    day: number,
    data: { subject?: string; preview?: string; content?: string },
  ): Promise<void> {
    const { data: rows, error } = await this.supabase
      .from('emails')
      .update(data)
      .eq('campaign_id', campaignId)
      .eq('day', day)
      .select('id')

    if (error) throw error
    if (!rows || rows.length === 0) throw new EmailNotSavedError(day)
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
