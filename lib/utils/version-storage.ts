import type { Email, EmailVersion } from '../types'

const VERSION_KEY_PREFIX = 'email-versions-'

import { extractChangeSummary } from './diff'

/**
 * Version storage utility for managing email versions
 */
export const versionStorage = {
  /**
   * Save a new version of an email
   */
  saveVersion(emailId: number, email: Email): EmailVersion {
    if (typeof window === 'undefined') {
      throw new Error('Version storage is only available in the browser')
    }

    // Validate input
    if (!email || typeof email.subject !== 'string' || typeof email.content !== 'string') {
      throw new Error('Invalid email data provided to saveVersion')
    }

    const versions = this.getVersions(emailId)
    const previousVersion = versions[versions.length - 1] ?? null

    if (
      previousVersion &&
      previousVersion.subject === email.subject &&
      previousVersion.content === email.content
    ) {
      return previousVersion
    }

    const newVersion: EmailVersion = {
      id: `${emailId}-${Date.now()}`,
      emailId,
      subject: email.subject,
      content: email.content,
      timestamp: Date.now(),
      changesSummary: extractChangeSummary(previousVersion, email),
    }

    // DEBUG: Log what we're saving
    /* console.log('[VERSION SAVE]', {
      emailId,
      versionId: newVersion.id,
      subject: newVersion.subject.substring(0, 50),
      contentPreview: newVersion.content.substring(0, 100),
      previousSubject: previousVersion?.subject?.substring(0, 50),
      totalVersions: versions.length + 1,
    }) */

    versions.push(newVersion)

    try {
      const data = JSON.stringify(versions)
      localStorage.setItem(`${VERSION_KEY_PREFIX}${emailId}`, data)

      // DEBUG: Verify it was saved correctly
      // const saved = localStorage.getItem(`${VERSION_KEY_PREFIX}${emailId}`)
      // const parsed = JSON.parse(saved || '[]')
      // console.log('[VERSION SAVED]', 'Total in storage:', parsed.length)
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Consider clearing old versions.')
      }
      console.error('Failed to save version:', error)
      throw error
    }

    return newVersion
  },

  /**
   * Get all versions for a specific email
   * Returns a DEEP COPY to prevent mutations
   */
  getVersions(emailId: number): EmailVersion[] {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const data = localStorage.getItem(`${VERSION_KEY_PREFIX}${emailId}`)
      const versions = data ? JSON.parse(data) : []

      // Return a deep copy to prevent any mutations affecting stored data
      return JSON.parse(JSON.stringify(versions))
    } catch (error) {
      console.error('Failed to parse versions:', error)
      return []
    }
  },

  /**
   * Get a specific version
   */
  getVersion(emailId: number, versionId: string): EmailVersion | null {
    const versions = this.getVersions(emailId)
    return versions.find((v) => v.id === versionId) || null
  },

  /**
   * Delete a specific version
   */
  deleteVersion(emailId: number, versionId: string): void {
    if (typeof window === 'undefined') {
      return
    }

    const versions = this.getVersions(emailId).filter((v) => v.id !== versionId)
    localStorage.setItem(`${VERSION_KEY_PREFIX}${emailId}`, JSON.stringify(versions))
  },

  /**
   * Get version count for an email
   */
  getVersionCount(emailId: number): number {
    return this.getVersions(emailId).length
  },

  /**
   * Clear all versions for an email
   */
  clearVersions(emailId: number): void {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.removeItem(`${VERSION_KEY_PREFIX}${emailId}`)
  },

  /**
   * Clear all versions for all emails
   */
  clearAllVersions(): void {
    if (typeof window === 'undefined') {
      return
    }

    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(VERSION_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  },
}
