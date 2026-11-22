import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import type { SupabaseClient } from '@supabase/supabase-js'

// Real-shaped UUIDs so the Zod schemas (id: uuid, user_id: uuid, …) accept the
// mocked rows. Audit-fix #X added strict UUID validation in the service layer
// so any test data that previously got away with `'camp-123'` now needs to
// look like a real ID.
const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const EMAIL_ID = '33333333-3333-4333-8333-333333333333'
const EMAIL_ID_2 = '44444444-4444-4444-8444-444444444444'

const baseCampaignRow = {
  id: CAMPAIGN_ID,
  user_id: USER_ID,
  name: 'Test Campaign',
  landing_page_url: 'https://example.com',
  landing_page_content: '<p>hi</p>',
  landing_page_metadata: {},
  tone: null,
  campaign_type: null,
  days: null,
  status: 'draft' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const baseEmailRow = {
  id: EMAIL_ID,
  campaign_id: CAMPAIGN_ID,
  day: 1,
  subject: 'Day 1',
  preview: 'p',
  content: 'c',
}

describe('CampaignStorageService', () => {
  let service: CampaignStorageService
  let mockSupabase: { from: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    }
    service = new CampaignStorageService(mockSupabase as unknown as SupabaseClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('creates a campaign successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: baseCampaignRow, error: null }),
      })

      const result = await service.createCampaign(USER_ID, {
        name: 'Test Campaign',
        landingPageUrl: 'https://example.com',
      })

      expect(result.id).toBe(CAMPAIGN_ID)
      expect(result.name).toBe('Test Campaign')
    })

    it('throws error on create failure', async () => {
      const error = new Error('Insert failed')

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.createCampaign(USER_ID, { name: 'Test Campaign' })).rejects.toThrow(
        'Insert failed',
      )
    })
  })

  describe('getCampaign', () => {
    it('returns campaign with emails', async () => {
      const mockData = {
        ...baseCampaignRow,
        emails: [baseEmailRow],
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getCampaign(CAMPAIGN_ID)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(CAMPAIGN_ID)
      expect(result?.emails.length).toBe(1)
    })

    it('returns null for PGRST116 error (not found)', async () => {
      const error = { code: 'PGRST116', message: 'Not found' }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const result = await service.getCampaign(CAMPAIGN_ID)

      expect(result).toBeNull()
    })

    it('throws error for non-PGRST116 errors', async () => {
      const error = new Error('Database error')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.getCampaign(CAMPAIGN_ID)).rejects.toThrow('Database error')
    })
  })

  describe('updateCampaign', () => {
    it('updates campaign successfully', async () => {
      const mockData = { ...baseCampaignRow, name: 'Updated Campaign' }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.updateCampaign(CAMPAIGN_ID, {
        name: 'Updated Campaign',
      })

      expect(result.name).toBe('Updated Campaign')
    })

    it('throws error on update failure', async () => {
      const error = new Error('Update failed')

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.updateCampaign(CAMPAIGN_ID, { name: 'New Name' })).rejects.toThrow(
        'Update failed',
      )
    })

    it('handles empty update data', async () => {
      // Empty update goes down a separate `select().eq().single()` path that
      // fetches the existing row instead of doing a no-op UPDATE.
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: baseCampaignRow, error: null }),
      })

      const result = await service.updateCampaign(CAMPAIGN_ID, {})

      expect(result.id).toBe(CAMPAIGN_ID)
    })
  })

  describe('listCampaigns', () => {
    it('lists all campaigns for user', async () => {
      const mockData = [
        { ...baseCampaignRow, id: CAMPAIGN_ID, name: 'Campaign 1' },
        { ...baseCampaignRow, id: EMAIL_ID, name: 'Campaign 2' },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.listCampaigns(USER_ID)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(CAMPAIGN_ID)
    })

    it('throws error on list failure', async () => {
      const error = new Error('Query failed')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.listCampaigns(USER_ID)).rejects.toThrow('Query failed')
    })
  })

  describe('deleteCampaign', () => {
    it('deletes campaign successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      await expect(service.deleteCampaign(CAMPAIGN_ID)).resolves.not.toThrow()
    })

    it('throws error on delete failure', async () => {
      const error = new Error('Delete failed')

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error }),
      })

      await expect(service.deleteCampaign(CAMPAIGN_ID)).rejects.toThrow('Delete failed')
    })
  })

  describe('saveEmails', () => {
    it('updates an existing row in place when day matches and inserts new ones', async () => {
      // Audit-fix #X rewrite: read existing → UPDATE-by-day → INSERT-missing →
      // DELETE-removed. We need to simulate three different from() responses:
      //   1. select().eq()        → existingRows lookup
      //   2. update().eq().select().single() → for day 1 (already exists)
      //   3. insert(...).select().single()   → for day 2 (new)
      // No DELETE call because all incoming days match or are added.
      const existingRows = [{ id: EMAIL_ID, day: 1 }]

      // Order matters: from() is called once for the read, then once per email.
      mockSupabase.from
        // 1. read existing
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: existingRows, error: null }),
        })
        // 2. update day 1 (existing)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { ...baseEmailRow, day: 1 }, error: null }),
        })
        // 3. insert day 2 (new)
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...baseEmailRow, id: EMAIL_ID_2, day: 2, subject: 'Day 2' },
            error: null,
          }),
        })

      const emails = [
        { id: 1, uuid: EMAIL_ID, day: 1, subject: 'Day 1', preview: 'p', content: 'c' },
        { id: 2, uuid: EMAIL_ID_2, day: 2, subject: 'Day 2', preview: 'p', content: 'c' },
      ]

      const result = await service.saveEmails(CAMPAIGN_ID, emails)

      expect(result).toHaveLength(2)
      expect(result[0].day).toBe(1)
      expect(result[1].day).toBe(2)
    })
  })

  describe('upsertEmails', () => {
    it('updates days that exist, inserts new ones, and never deletes other days', async () => {
      // A regenerate saves Day 1 on its own first. Days 2..N of the old run
      // must survive that (with their version history) until they are replaced.
      const deleteSpy = vi.fn()
      const updatePayload = vi.fn().mockReturnThis()
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: EMAIL_ID, day: 1 },
              { id: EMAIL_ID_2, day: 2 },
            ],
            error: null,
          }),
          delete: deleteSpy,
        })
        .mockReturnValueOnce({
          update: updatePayload,
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...baseEmailRow, subject: 'New Day 1' },
            error: null,
          }),
          delete: deleteSpy,
        })

      const result = await service.upsertEmails(CAMPAIGN_ID, [
        { id: 1, uuid: null, day: 1, subject: 'New Day 1', preview: 'p', content: 'c' },
      ])

      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
      expect(updatePayload).toHaveBeenCalledWith(
        expect.objectContaining({ day: 1, subject: 'New Day 1' }),
      )
      expect(deleteSpy).not.toHaveBeenCalled()
      expect(result).toEqual([expect.objectContaining({ day: 1, uuid: EMAIL_ID })])
    })
  })

  describe('deleteEmailsAfterDay', () => {
    it('deletes only the days after the given one', async () => {
      const gt = vi.fn().mockResolvedValue({ error: null })
      const eq = vi.fn().mockReturnValue({ gt })
      mockSupabase.from.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) })

      await service.deleteEmailsAfterDay(CAMPAIGN_ID, 1)

      expect(mockSupabase.from).toHaveBeenCalledWith('emails')
      expect(eq).toHaveBeenCalledWith('campaign_id', CAMPAIGN_ID)
      expect(gt).toHaveBeenCalledWith('day', 1)
    })

    it('throws when the delete fails', async () => {
      const gt = vi.fn().mockResolvedValue({ error: new Error('Delete failed') })
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gt }) }),
      })

      await expect(service.deleteEmailsAfterDay(CAMPAIGN_ID, 1)).rejects.toThrow('Delete failed')
    })
  })

  describe('updateEmail', () => {
    // update().eq('campaign_id', …).eq('day', …).select('id') resolves with
    // the rows it changed.
    const mockUpdate = (result: { data: unknown; error: unknown }) => {
      const select = vi.fn().mockResolvedValue(result)
      const secondEq = vi.fn().mockReturnValue({ select })
      const firstEq = vi.fn().mockReturnValue({ eq: secondEq })
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: firstEq }),
      })
      return { firstEq, secondEq, select }
    }

    it('updates email successfully', async () => {
      const { firstEq, secondEq } = mockUpdate({ data: [{ id: EMAIL_ID }], error: null })

      await expect(
        service.updateEmail(CAMPAIGN_ID, 1, { subject: 'Updated' }),
      ).resolves.toBeUndefined()
      expect(firstEq).toHaveBeenCalledWith('campaign_id', CAMPAIGN_ID)
      expect(secondEq).toHaveBeenCalledWith('day', 1)
    })

    // Bug: an email that never reached the database (generation failed
    // before saving) matched 0 rows, returned no error, and the editor said
    // "Saved" while every edit was lost.
    it('rejects when no saved email matched, instead of reporting success', async () => {
      mockUpdate({ data: [], error: null })

      await expect(service.updateEmail(CAMPAIGN_ID, 2, { subject: 'Lost' })).rejects.toMatchObject({
        name: 'EmailNotSavedError',
      })
    })

    it('throws the database error', async () => {
      mockUpdate({ data: null, error: new Error('Update failed') })

      await expect(service.updateEmail(CAMPAIGN_ID, 1, { subject: 'X' })).rejects.toThrow(
        'Update failed',
      )
    })
  })

  describe('getEmail', () => {
    it('gets email by campaign and day', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: baseEmailRow, error: null }),
      })

      const result = await service.getEmail(CAMPAIGN_ID, 1)

      expect(result).not.toBeNull()
      expect(result?.day).toBe(1)
    })

    it('returns null for PGRST116 error', async () => {
      const error = { code: 'PGRST116' }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const result = await service.getEmail(CAMPAIGN_ID, 999)

      expect(result).toBeNull()
    })
  })
})
