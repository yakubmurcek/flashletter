'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import type { Email } from '@/lib/types'

interface VersionTrackingReturn {
  versionCounts: Record<number, number>
  restoreVersion: (restoreData: {
    emailId: number
    subject: string
    content: string
  }) => Promise<void>
  refreshVersionCount: (emailId: number) => Promise<void>
  isLoading: boolean
}

export function useVersionTracking(emails: Email[]): VersionTrackingReturn {
  const [versionCounts, setVersionCounts] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()
  const versionStorageService = useMemo(() => new EmailVersionStorageService(supabase), [supabase])

  // Load version counts for all emails
  useEffect(() => {
    if (emails.length > 0) {
      const loadVersionCounts = async () => {
        setIsLoading(true)
        const counts: Record<number, number> = {}

        // Collect all UUIDs to fetch counts in batch
        const emailUuids = emails.map((e) => e.uuid).filter((uuid): uuid is string => !!uuid)

        try {
          // Fetch all counts in a single query
          const batchCounts = await versionStorageService.getBatchVersionCounts(emailUuids)

          // Map the UUID-based counts back to the email IDs
          for (const email of emails) {
            if (email.uuid && batchCounts[email.uuid] !== undefined) {
              counts[email.id] = batchCounts[email.uuid]
            } else {
              counts[email.id] = 0
            }
          }
        } catch (error) {
          console.error('Failed to load version counts in batch:', error)
          // Fallback to 0 for all emails on error
          emails.forEach((email) => {
            counts[email.id] = 0
          })
        }

        setVersionCounts(counts)
        setIsLoading(false)
      }

      void loadVersionCounts()
    }
  }, [emails, versionStorageService])

  // Note: Restore handling is now done in the editor page to avoid duplicate processing

  const restoreVersion = useCallback(
    async (restoreData: { emailId: number; subject: string; content: string }) => {
      // This will be called by the parent component to update the email
      // The actual email update logic is handled in the parent
      // This function just handles the version count update

      const restoredEmail = emails.find((e) => e.id === restoreData.emailId)
      if (restoredEmail?.uuid) {
        try {
          const count = await versionStorageService.getVersionCount(restoredEmail.uuid)
          setVersionCounts((prev) => ({
            ...prev,
            [restoreData.emailId]: count,
          }))
        } catch (error) {
          console.error('Failed to load version count after restore:', error)
        }
      }
    },
    [emails, versionStorageService],
  )

  const refreshVersionCount = useCallback(
    async (emailId: number) => {
      const email = emails.find((e) => e.id === emailId)
      if (email?.uuid) {
        try {
          const count = await versionStorageService.getVersionCount(email.uuid)
          setVersionCounts((prev) => ({
            ...prev,
            [emailId]: count,
          }))
        } catch (error) {
          console.error(`Failed to refresh version count for email ${emailId}:`, error)
        }
      }
    },
    [emails, versionStorageService],
  )

  return {
    versionCounts,
    restoreVersion,
    refreshVersionCount,
    isLoading,
  }
}
