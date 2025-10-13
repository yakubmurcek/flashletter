import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import { EMAIL_SAVE_DEBOUNCE_MS } from '@/lib/constants/app'
import type { Email } from '@/lib/types'

interface EmailAutosaveReturn {
  saveEmail: (
    id: number,
    updates: Partial<Email>,
    skipVersioning?: boolean
  ) => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
  cleanup: () => void
}

export function useEmailAutosave(
  emails: Email[],
  currentCampaignId: string | null,
  updateEmail: (id: number, updates: Partial<Email>) => void
): EmailAutosaveReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  const lastSavedRef = useRef<Date | null>(null)

  const supabase = createClient()
  const campaignService = new CampaignStorageService(supabase)
  const versionStorageService = new EmailVersionStorageService(supabase)

  const saveEmail = useCallback(
    async (id: number, updates: Partial<Email>, skipVersioning = false) => {
      // Save current version before updating (unless explicitly skipped)
      if (!skipVersioning) {
        const currentEmail = emails.find((e) => e.id === id)
        if (currentEmail && currentEmail.uuid) {
          try {
            await versionStorageService.saveVersion(
              currentEmail.uuid,
              currentEmail.day,
              {
                subject: currentEmail.subject,
                content: currentEmail.content,
              }
            )
          } catch (error) {
            console.error('Failed to save version:', error)
            // Continue with update even if versioning fails
          }
        } else {
          console.error('Email not found or missing UUID for versioning:', id)
        }
      }

      // Update the email in local state
      updateEmail(id, updates)

      // Save to Supabase if we have a campaign ID
      if (currentCampaignId) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }

        // Debounce the save operation
        saveTimeoutRef.current = setTimeout(async () => {
          isSavingRef.current = true
          try {
            await campaignService.updateEmail(currentCampaignId, id, updates)
            lastSavedRef.current = new Date()
          } catch (error) {
            console.error('Failed to save email to database:', error)
          } finally {
            isSavingRef.current = false
          }
        }, EMAIL_SAVE_DEBOUNCE_MS)
      }
    },
    [
      emails,
      currentCampaignId,
      updateEmail,
      campaignService,
      versionStorageService,
    ]
  )

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return {
    saveEmail,
    isSaving: isSavingRef.current,
    lastSaved: lastSavedRef.current,
    cleanup,
  }
}
