import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/lib/utils/diff', () => ({
  extractChangeSummary: vi.fn(() => 'subject changed'),
}))

describe('EmailVersionStorageService', () => {
  let service: EmailVersionStorageService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    }
    service = new EmailVersionStorageService(mockSupabase as SupabaseClient)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('saveVersion', () => {
    it('creates new version on first save', async () => {
      const mockData = {
        id: 'ver-1',
        email_id: 'email-uuid',
        subject: 'Test Subject',
        content: 'Test Content',
        changes_summary: 'subject changed',
        created_at: new Date().toISOString(),
      }

      // Mock getVersions to return empty
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      // Mock insert
      const insertMock = vi.fn().mockReturnThis()
      const selectMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ data: mockData, error: null })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabase.from.mockReturnValueOnce({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      })

      const result = await service.saveVersion('email-uuid', 1, {
        subject: 'Test Subject',
        content: 'Test Content',
      })

      expect(result.id).toBe('ver-1')
      expect(result.subject).toBe('Test Subject')
    })

    it('deduplicates identical content and returns previous version', async () => {
      // Source joins email_versions with emails!inner(day), so each row needs
      // an `emails: { day }` shape for the mapping in getVersions to work.
      const previousVersion = {
        id: 'ver-1',
        email_id: 'email-uuid',
        subject: 'Test Subject',
        content: 'Test Content',
        changes_summary: 'initial',
        created_at: new Date().toISOString(),
        emails: { day: 1 },
      }

      // Mock getVersions to return the previous version
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [previousVersion], error: null }),
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await service.saveVersion('email-uuid', 1, {
        subject: 'Test Subject',
        content: 'Test Content',
      })

      expect(result.id).toBe('ver-1')
      expect(consoleSpy).toHaveBeenCalledWith('Skipping duplicate version save - content unchanged')
      consoleSpy.mockRestore()
    })

    it('creates new version when content differs from previous', async () => {
      const previousVersion = {
        id: 'ver-1',
        email_id: 'email-uuid',
        subject: 'Old Subject',
        content: 'Old Content',
        changes_summary: 'initial',
        created_at: new Date().toISOString(),
        emails: { day: 1 },
      }

      const newVersionData = {
        id: 'ver-2',
        email_id: 'email-uuid',
        subject: 'New Subject',
        content: 'New Content',
        changes_summary: 'subject changed',
        created_at: new Date().toISOString(),
        emails: { day: 1 },
      }

      // Mock getVersions
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [previousVersion], error: null }),
      })

      // Mock insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newVersionData, error: null }),
      })

      const result = await service.saveVersion('email-uuid', 1, {
        subject: 'New Subject',
        content: 'New Content',
      })

      expect(result.id).toBe('ver-2')
      expect(result.subject).toBe('New Subject')
    })

    it('throws error on save failure', async () => {
      const error = new Error('Insert failed')

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(
        service.saveVersion('email-uuid', 1, {
          subject: 'Test',
          content: 'Test',
        }),
      ).rejects.toThrow('Insert failed')
    })
  })

  describe('getVersions', () => {
    it('returns all versions for an email', async () => {
      const mockData = [
        {
          id: 'ver-1',
          email_id: 'email-uuid',
          subject: 'Subject 1',
          content: 'Content 1',
          changes_summary: 'initial',
          created_at: new Date().toISOString(),
          emails: { day: 1 },
        },
        {
          id: 'ver-2',
          email_id: 'email-uuid',
          subject: 'Subject 2',
          content: 'Content 2',
          changes_summary: 'updated',
          created_at: new Date().toISOString(),
          emails: { day: 1 },
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getVersions('email-uuid')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('ver-1')
      expect(result[1].id).toBe('ver-2')
    })
  })

  describe('getVersion', () => {
    it('returns a specific version', async () => {
      const mockData = {
        id: 'ver-1',
        email_id: 'email-uuid',
        subject: 'Test Subject',
        content: 'Test Content',
        changes_summary: 'initial',
        created_at: new Date().toISOString(),
        emails: { day: 1 },
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getVersion('ver-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('ver-1')
    })

    it('returns null for PGRST116 error (not found)', async () => {
      const error = { code: 'PGRST116' }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const result = await service.getVersion('nonexistent')

      expect(result).toBeNull()
    })

    it('throws error for non-PGRST116 errors', async () => {
      const error = new Error('Database error')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.getVersion('ver-1')).rejects.toThrow('Database error')
    })
  })

  describe('deleteVersion', () => {
    it('deletes a version successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      await expect(service.deleteVersion('ver-1')).resolves.not.toThrow()
    })

    it('throws error on delete failure', async () => {
      const error = new Error('Delete failed')

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error }),
      })

      await expect(service.deleteVersion('ver-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('getVersionCount', () => {
    it('returns version count for an email', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      })

      const result = await service.getVersionCount('email-uuid')

      expect(result).toBe(5)
    })

    it('throws error on query failure', async () => {
      const error = new Error('Query failed')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error }),
      })

      await expect(service.getVersionCount('email-uuid')).rejects.toThrow('Query failed')
    })
  })

  describe('getBatchVersionCounts', () => {
    it('returns empty object for empty input', async () => {
      const result = await service.getBatchVersionCounts([])

      expect(result).toEqual({})
    })

    it('returns version counts for multiple emails', async () => {
      const mockData = [
        { email_id: 'email-1' },
        { email_id: 'email-1' },
        { email_id: 'email-2' },
        { email_id: 'email-3' },
        { email_id: 'email-3' },
        { email_id: 'email-3' },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getBatchVersionCounts([
        'email-1',
        'email-2',
        'email-3',
        'email-4',
      ])

      expect(result['email-1']).toBe(2)
      expect(result['email-2']).toBe(1)
      expect(result['email-3']).toBe(3)
      expect(result['email-4']).toBe(0)
    })

    it('initializes counts for all requested UUIDs to 0', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await service.getBatchVersionCounts(['email-1', 'email-2', 'email-3'])

      expect(result['email-1']).toBe(0)
      expect(result['email-2']).toBe(0)
      expect(result['email-3']).toBe(0)
    })

    it('throws error on query failure', async () => {
      const error = new Error('Query failed')

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error }),
      })

      await expect(service.getBatchVersionCounts(['email-1', 'email-2'])).rejects.toThrow(
        'Query failed',
      )
    })

    it('ignores counts for UUIDs not in original request', async () => {
      const mockData = [
        { email_id: 'email-1' },
        { email_id: 'email-unknown' }, // Should be ignored
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await service.getBatchVersionCounts(['email-1', 'email-2'])

      expect(result['email-1']).toBe(1)
      expect(result['email-2']).toBe(0)
      expect(result['email-unknown']).toBeUndefined()
    })
  })

  describe('clearVersions', () => {
    it('clears all versions for an email', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      await expect(service.clearVersions('email-uuid')).resolves.not.toThrow()
    })

    it('throws error on clear failure', async () => {
      const error = new Error('Delete failed')

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error }),
      })

      await expect(service.clearVersions('email-uuid')).rejects.toThrow('Delete failed')
    })
  })
})
