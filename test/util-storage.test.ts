import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from '@/lib/utils/storage'
import type { StorageData } from '@/lib/utils/storage'

describe('storage', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
  })

  describe('get', () => {
    it('returns empty object when storage is empty', () => {
      const result = storage.get()
      expect(result).toEqual({})
    })

    it('returns parsed data when storage has data', () => {
      const data: StorageData = { generatedEmails: [] }
      sessionStorage.setItem('campaign-data', JSON.stringify(data))

      const result = storage.get()
      expect(result).toEqual(data)
    })

    it('handles missing window gracefully', () => {
      const originalWindow = globalThis.window
      // Temporarily remove window
      ;(globalThis as { window?: unknown }).window = undefined

      const result = storage.get()
      expect(result).toEqual({})

      // Restore window
      ;(globalThis as { window?: unknown }).window = originalWindow
    })
  })

  describe('set', () => {
    it('saves data to sessionStorage', () => {
      const data: StorageData = { generatedEmails: [] }
      storage.set(data)

      const stored = sessionStorage.getItem('campaign-data')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!)).toEqual(data)
    })

    it('merges with existing data', () => {
      const initial: StorageData = { generatedEmails: [] }
      storage.set(initial)

      const update: StorageData = { config: { tone: 'friendly', campaignType: 'nurture', days: 7 } }
      storage.set(update)

      const result = storage.get()
      expect(result.generatedEmails).toEqual([])
      expect(result.config).toBeDefined()
      expect(result.config?.tone).toBe('friendly')
    })

    it('overwrites matching keys', () => {
      const initial: StorageData = {
        config: { tone: 'formal', campaignType: 'promotional', days: 5 },
      }
      storage.set(initial)

      const update: StorageData = { config: { tone: 'casual', campaignType: 'nurture', days: 7 } }
      storage.set(update)

      const result = storage.get()
      expect(result.config?.tone).toBe('casual')
    })

    it('handles missing window gracefully', () => {
      const originalWindow = globalThis.window
      ;(globalThis as { window?: unknown }).window = undefined

      expect(() => {
        storage.set({ generatedEmails: [] })
      }).not.toThrow()
      ;(globalThis as { window?: unknown }).window = originalWindow
    })
  })

  describe('clear', () => {
    it('removes stored data', () => {
      const data: StorageData = { generatedEmails: [] }
      storage.set(data)
      expect(storage.get()).not.toEqual({})

      storage.clear()
      expect(storage.get()).toEqual({})
    })

    it('handles missing window gracefully', () => {
      const originalWindow = globalThis.window
      ;(globalThis as { window?: unknown }).window = undefined

      expect(() => {
        storage.clear()
      }).not.toThrow()
      ;(globalThis as { window?: unknown }).window = originalWindow
    })
  })

  describe('integration', () => {
    it('supports full workflow: set, get, update, clear', () => {
      // Set initial data
      storage.set({ generatedEmails: [] })
      let result = storage.get()
      expect(result.generatedEmails).toEqual([])

      // Update data
      storage.set({
        config: { tone: 'friendly', campaignType: 'nurture', days: 7 },
      })
      result = storage.get()
      expect(result.generatedEmails).toEqual([])
      expect(result.config?.tone).toBe('friendly')

      // Clear data
      storage.clear()
      result = storage.get()
      expect(result).toEqual({})
    })

    it('handles partial updates', () => {
      const fullData: StorageData = {
        generatedEmails: [],
        config: { tone: 'formal', campaignType: 'promotional', days: 5 },
        landingPageData: { url: 'http://example.com' },
      }

      storage.set(fullData)

      // Partial update
      storage.set({ config: { tone: 'casual', campaignType: 'nurture', days: 7 } })

      const result = storage.get()
      expect(result.generatedEmails).toEqual([])
      expect(result.config?.tone).toBe('casual')
      expect(result.landingPageData?.url).toBe('http://example.com')
    })

    it('recovers from corrupted data', () => {
      // Simulate corrupted data
      sessionStorage.setItem('campaign-data', 'invalid json')

      const result = storage.get()
      expect(result).toEqual({})
    })
  })
})
