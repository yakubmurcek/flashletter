import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { versionStorage } from '@/lib/utils/version-storage'
import type { Email, EmailVersion } from '@/lib/types'

describe('versionStorage', () => {
  const mockEmail: Email = {
    id: 1,
    day: 1,
    subject: 'Test Subject',
    preview: 'Test preview',
    content: 'Test content',
  }

  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveVersion', () => {
    it('throws error when window is undefined', () => {
      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      expect(() => {
        versionStorage.saveVersion(1, mockEmail)
      }).toThrow()

      ;(globalThis as any).window = originalWindow
    })

    it('creates first version for an email', () => {
      const version = versionStorage.saveVersion(1, mockEmail)

      expect(version).toBeDefined()
      expect(version.emailId).toBe(1)
      expect(version.subject).toBe('Test Subject')
      expect(version.content).toBe('Test content')
      expect(version.changesSummary).toBe('Initial version')
    })

    it('generates unique version ID', () => {
      const version1 = versionStorage.saveVersion(1, mockEmail)
      const version2 = versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated Subject',
      })

      expect(version1.id).not.toBe(version2.id)
    })

    it('returns existing version if email unchanged', () => {
      const version1 = versionStorage.saveVersion(1, mockEmail)
      const version2 = versionStorage.saveVersion(1, mockEmail)

      expect(version1.id).toBe(version2.id)
    })

    it('sets timestamp on new version', () => {
      const before = Date.now()
      const version = versionStorage.saveVersion(1, mockEmail)
      const after = Date.now()

      expect(version.timestamp).toBeGreaterThanOrEqual(before)
      expect(version.timestamp).toBeLessThanOrEqual(after)
    })

    it('detects subject changes', () => {
      versionStorage.saveVersion(1, mockEmail)
      const updated = versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'New Subject',
      })

      expect(updated.changesSummary).toContain('subject')
    })

    it('detects content changes', () => {
      versionStorage.saveVersion(1, mockEmail)
      const updated = versionStorage.saveVersion(1, {
        ...mockEmail,
        content: 'New content line 1\nNew content line 2',
      })

      expect(updated.changesSummary).toContain('line')
    })

    it('persists version to localStorage', () => {
      const version = versionStorage.saveVersion(1, mockEmail)
      const stored = localStorage.getItem('email-versions-1')

      expect(stored).toBeDefined()
      const parsed = JSON.parse(stored!)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].id).toBe(version.id)
    })

    it('throws error for invalid email data', () => {
      expect(() => {
        versionStorage.saveVersion(1, {
          subject: null,
          content: 'test',
        } as any)
      }).toThrow()
    })
  })

  describe('getVersions', () => {
    it('returns empty array when no versions exist', () => {
      const versions = versionStorage.getVersions(1)
      expect(versions).toEqual([])
    })

    it('returns all versions for an email', () => {
      versionStorage.saveVersion(1, mockEmail)
      versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated',
      })

      const versions = versionStorage.getVersions(1)
      expect(versions.length).toBe(2)
    })

    it('returns deep copy to prevent mutations', () => {
      versionStorage.saveVersion(1, mockEmail)
      const versions1 = versionStorage.getVersions(1)
      const versions2 = versionStorage.getVersions(1)

      versions1[0].subject = 'Modified'
      expect(versions2[0].subject).toBe('Test Subject')
    })

    it('returns empty array for missing window', () => {
      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      const versions = versionStorage.getVersions(1)
      expect(versions).toEqual([])

      ;(globalThis as any).window = originalWindow
    })

    it('handles corrupted localStorage data', () => {
      localStorage.setItem('email-versions-1', 'invalid json')
      const versions = versionStorage.getVersions(1)
      expect(versions).toEqual([])
    })
  })

  describe('getVersion', () => {
    it('returns specific version by ID', () => {
      const saved = versionStorage.saveVersion(1, mockEmail)
      const retrieved = versionStorage.getVersion(1, saved.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(saved.id)
    })

    it('returns null for non-existent version', () => {
      const result = versionStorage.getVersion(1, 'non-existent')
      expect(result).toBeNull()
    })

    it('returns null for non-existent email', () => {
      versionStorage.saveVersion(1, mockEmail)
      const result = versionStorage.getVersion(999, 'any-id')
      expect(result).toBeNull()
    })
  })

  describe('deleteVersion', () => {
    it('removes specific version', () => {
      const v1 = versionStorage.saveVersion(1, mockEmail)
      const v2 = versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated',
      })

      versionStorage.deleteVersion(1, v1.id)

      const versions = versionStorage.getVersions(1)
      expect(versions.length).toBe(1)
      expect(versions[0].id).toBe(v2.id)
    })

    it('handles deletion of non-existent version', () => {
      versionStorage.saveVersion(1, mockEmail)
      expect(() => {
        versionStorage.deleteVersion(1, 'non-existent')
      }).not.toThrow()
    })

    it('ignores missing window', () => {
      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      expect(() => {
        versionStorage.deleteVersion(1, 'id')
      }).not.toThrow()

      ;(globalThis as any).window = originalWindow
    })
  })

  describe('getVersionCount', () => {
    it('returns 0 for new email', () => {
      const count = versionStorage.getVersionCount(1)
      expect(count).toBe(0)
    })

    it('returns correct version count', () => {
      versionStorage.saveVersion(1, mockEmail)
      versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated',
      })

      const count = versionStorage.getVersionCount(1)
      expect(count).toBe(2)
    })
  })

  describe('clearVersions', () => {
    it('removes all versions for an email', () => {
      versionStorage.saveVersion(1, mockEmail)
      versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated',
      })

      versionStorage.clearVersions(1)

      const versions = versionStorage.getVersions(1)
      expect(versions).toEqual([])
    })

    it('ignores missing window', () => {
      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      expect(() => {
        versionStorage.clearVersions(1)
      }).not.toThrow()

      ;(globalThis as any).window = originalWindow
    })
  })

  describe('clearAllVersions', () => {
    it('removes all versions for all emails', () => {
      versionStorage.saveVersion(1, mockEmail)
      versionStorage.saveVersion(2, { ...mockEmail, id: 2, day: 2 })

      versionStorage.clearAllVersions()

      expect(versionStorage.getVersions(1)).toEqual([])
      expect(versionStorage.getVersions(2)).toEqual([])
    })

    it('ignores missing window', () => {
      const originalWindow = globalThis.window
      ;(globalThis as any).window = undefined

      expect(() => {
        versionStorage.clearAllVersions()
      }).not.toThrow()

      ;(globalThis as any).window = originalWindow
    })
  })

  describe('integration', () => {
    it('supports full workflow', () => {
      // Save versions
      const v1 = versionStorage.saveVersion(1, mockEmail)
      const v2 = versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated Subject',
      })

      // Get count
      expect(versionStorage.getVersionCount(1)).toBe(2)

      // Get specific version
      const retrieved = versionStorage.getVersion(1, v2.id)
      expect(retrieved?.subject).toBe('Updated Subject')

      // Delete version
      versionStorage.deleteVersion(1, v1.id)
      expect(versionStorage.getVersionCount(1)).toBe(1)

      // Clear all
      versionStorage.clearVersions(1)
      expect(versionStorage.getVersionCount(1)).toBe(0)
    })

    it('maintains separate version history per email', () => {
      versionStorage.saveVersion(1, mockEmail)
      versionStorage.saveVersion(1, {
        ...mockEmail,
        subject: 'Updated 1',
      })

      versionStorage.saveVersion(2, {
        ...mockEmail,
        id: 2,
        day: 2,
        subject: 'Email 2',
      })

      expect(versionStorage.getVersionCount(1)).toBe(2)
      expect(versionStorage.getVersionCount(2)).toBe(1)
    })
  })
})
