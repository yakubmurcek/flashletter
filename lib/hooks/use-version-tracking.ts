import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import { useUrlState } from './use-url-state'
import type { Email } from '@/lib/types'

interface VersionTrackingReturn {
  versionCounts: Record<number, number>
  restoreVersion: (restoreData: any) => Promise<void>
  refreshVersionCount: (emailId: number) => Promise<void>
  isLoading: boolean
}

export function useVersionTracking(emails: Email[]): VersionTrackingReturn {
  const [versionCounts, setVersionCounts] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { getParam, setMultipleParams, getCampaignId } = useUrlState()

  const supabase = createClient()
  const versionStorageService = new EmailVersionStorageService(supabase)
  const restoreParam = getParam('restore')
  const campaignIdFromUrl = getCampaignId()

  // Load version counts for all emails
  useEffect(() => {
    if (emails.length > 0) {
      const loadVersionCounts = async () => {
        setIsLoading(true)
        const counts: Record<number, number> = {}

        for (const email of emails) {
          if (email.uuid) {
            try {
              const count = await versionStorageService.getVersionCount(
                email.uuid
              )
              counts[email.id] = count
            } catch (error) {
              console.error(
                `Failed to load version count for email ${email.id}:`,
                error
              )
              counts[email.id] = 0
            }
          } else {
            counts[email.id] = 0
          }
        }

        setVersionCounts(counts)
        setIsLoading(false)
      }

      loadVersionCounts()
    }
  }, [emails])

  // Handle restoration from history page
  useEffect(() => {
    if (restoreParam) {
      const handleRestore = async () => {
        try {
          const restoreData = JSON.parse(decodeURIComponent(restoreParam))

          // Validate restore data
          if (
            restoreData &&
            typeof restoreData.emailId === 'number' &&
            typeof restoreData.subject === 'string' &&
            typeof restoreData.content === 'string'
          ) {
            await restoreVersion(restoreData)

            // Clear the restore param from URL, preserve campaign ID atomically
            const params: Record<string, string> = {
              email: restoreData.emailId.toString(),
            }
            if (campaignIdFromUrl) {
              params.campaign = campaignIdFromUrl
            }
            setMultipleParams(params)
          } else {
            console.error('Invalid restore data:', restoreData)
          }
        } catch (error) {
          console.error('Failed to restore version:', error)
        }
      }
      handleRestore()
    }
  }, [restoreParam, campaignIdFromUrl, setMultipleParams])

  const restoreVersion = useCallback(
    async (restoreData: any) => {
      // This will be called by the parent component to update the email
      // The actual email update logic is handled in the parent
      // This function just handles the version count update

      const restoredEmail = emails.find((e) => e.id === restoreData.emailId)
      if (restoredEmail?.uuid) {
        try {
          const count = await versionStorageService.getVersionCount(
            restoredEmail.uuid
          )
          setVersionCounts((prev) => ({
            ...prev,
            [restoreData.emailId]: count,
          }))
        } catch (error) {
          console.error('Failed to load version count after restore:', error)
        }
      }
    },
    [emails, versionStorageService]
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
          console.error(
            `Failed to refresh version count for email ${emailId}:`,
            error
          )
        }
      }
    },
    [emails, versionStorageService]
  )

  return {
    versionCounts,
    restoreVersion,
    refreshVersionCount,
    isLoading,
  }
}
