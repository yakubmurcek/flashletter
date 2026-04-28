import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('CampaignStorageService', () => {
  let service: CampaignStorageService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    }
    service = new CampaignStorageService(mockSupabase as SupabaseClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('creates a campaign successfully', async () => {
      const mockData = {
        id: 'camp-123',
        user_id: 'user-456',
        name: 'Test Campaign',
        landing_page_url: 'https://example.com',
        landing_page_content: '<p>hi</p>',
        landing_page_metadata: {},
        status: 'draft',
        created_at: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.createCampaign('user-456', {
        name: 'Test Campaign',
        landingPageUrl: 'https://example.com',
      })

      expect(result.id).toBe('camp-123')
      expect(result.name).toBe('Test Campaign')
    })

    it('throws error on create failure', async () => {
      const error = new Error('Insert failed')

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(
        service.createCampaign('user-456', { name: 'Test Campaign' }),
      ).rejects.toThrow('Insert failed')
    })
  })

  describe('getCampaign', () => {
    it('returns campaign with emails', async () => {
      const mockData = {
        id: 'camp-123',
        user_id: 'user-456',
        name: 'Test Campaign',
        landing_page_url: 'https://example.com',
        landing_page_content: '<p>hi</p>',
        landing_page_metadata: {},
        status: 'draft',
        created_at: new Date().toISOString(),
        emails: [
          {
            id: 'email-1',
            campaign_id: 'camp-123',
            day: 1,
            subject: 'Day 1',
            preview: 'p',
            content: 'c',
          },
        ],
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getCampaign('camp-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('camp-123')
      expect(result?.emails.length).toBe(1)
    })

    it('returns null for PGRST116 error (not found)', async () => {
      const error = { code: 'PGRST116', message: 'Not found' }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const result = await service.getCampaign('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for non-PGRST116 errors', async () => {
      const error = new Error('Database error')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.getCampaign('camp-123')).rejects.toThrow('Database error')
    })
  })

  describe('updateCampaign', () => {
    it('updates campaign successfully', async () => {
      const mockData = {
        id: 'camp-123',
        user_id: 'user-456',
        name: 'Updated Campaign',
        landing_page_url: 'https://example.com',
        landing_page_content: '<p>hi</p>',
        landing_page_metadata: {},
        status: 'draft',
        created_at: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.updateCampaign('camp-123', {
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

      await expect(
        service.updateCampaign('camp-123', { name: 'New Name' }),
      ).rejects.toThrow('Update failed')
    })

    it('handles empty update data', async () => {
      const mockData = {
        id: 'camp-123',
        user_id: 'user-456',
        name: 'Existing Campaign',
        status: 'draft',
        created_at: new Date().toISOString(),
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.updateCampaign('camp-123', {})

      expect(result.id).toBe('camp-123')
    })
  })

  describe('listCampaigns', () => {
    it('lists all campaigns for user', async () => {
      const mockData = [
        {
          id: 'camp-1',
          user_id: 'user-456',
          name: 'Campaign 1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'camp-2',
          user_id: 'user-456',
          name: 'Campaign 2',
          created_at: new Date().toISOString(),
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.listCampaigns('user-456')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('camp-1')
    })

    it('throws error on list failure', async () => {
      const error = new Error('Query failed')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.listCampaigns('user-456')).rejects.toThrow('Query failed')
    })
  })

  describe('deleteCampaign', () => {
    it('deletes campaign successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      await expect(service.deleteCampaign('camp-123')).resolves.not.toThrow()
    })

    it('throws error on delete failure', async () => {
      const error = new Error('Delete failed')

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error }),
      })

      await expect(service.deleteCampaign('camp-123')).rejects.toThrow('Delete failed')
    })
  })

  describe('saveEmails', () => {
    it('saves emails for campaign', async () => {
      const mockData = [
        {
          id: 'email-1',
          campaign_id: 'camp-123',
          day: 1,
          subject: 'Day 1',
          preview: 'p',
          content: 'c',
        },
      ]

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const emails = [
        { id: 1, uuid: 'email-1', day: 1, subject: 'Day 1', preview: 'p', content: 'c' },
      ]

      const result = await service.saveEmails('camp-123', emails)

      expect(result).toHaveLength(1)
      expect(result[0].day).toBe(1)
    })
  })

  describe('updateEmail', () => {
    it('updates email successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      })

      const eqMock = mockSupabase.from().update().eq
      eqMock.mockResolvedValue({ error: null })

      await expect(
        service.updateEmail('camp-123', 1, { subject: 'Updated' }),
      ).resolves.not.toThrow()
    })
  })

  describe('getEmail', () => {
    it('gets email by campaign and day', async () => {
      const mockData = {
        id: 'email-1',
        campaign_id: 'camp-123',
        day: 1,
        subject: 'Day 1',
        preview: 'p',
        content: 'c',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getEmail('camp-123', 1)

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

      const result = await service.getEmail('camp-123', 999)

      expect(result).toBeNull()
    })
  })
})
