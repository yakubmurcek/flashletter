'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import { EMAIL_SAVE_DEBOUNCE_MS } from '@/lib/constants/app'
import type { Email } from '@/lib/types'

interface EmailAutosaveReturn {
  saveEmail: (id: number, updates: Partial<Email>, skipVersioning?: boolean) => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
  cleanup: () => void
}

export function useEmailAutosave(
  emails: Email[],
  currentCampaignId: string | null,
  updateEmail: (id: number, updates: Partial<Email>) => void,
): EmailAutosaveReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Keep a ref to the latest emails array to avoid stale closures in setTimeout
  const emailsRef = useRef(emails)
  useEffect(() => {
    emailsRef.current = emails
  }, [emails])

  const supabase = createClient()
  const campaignService = useMemo(() => new CampaignStorageService(supabase), [supabase])
  const versionStorageService = useMemo(() => new EmailVersionStorageService(supabase), [supabase])

  const saveEmail = useCallback(
    async (id: number, updates: Partial<Email>, skipVersioning = false) => {
      // Save current version before updating (unless explicitly skipped)
      if (!skipVersioning) {
        const currentEmail = emails.find((e) => e.id === id)
        if (currentEmail && currentEmail.uuid) {
          try {
            await versionStorageService.saveVersion(currentEmail.uuid, currentEmail.day, {
              subject: currentEmail.subject,
              content: currentEmail.content,
            })
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
          setIsSaving(true)
          try {
            // Get the complete current email state from the ref to avoid data loss
            // This ensures we save ALL fields, not just the last partial update
            const currentEmail = emailsRef.current.find((e) => e.id === id)
            if (currentEmail) {
              await campaignService.updateEmail(currentCampaignId, id, {
                subject: currentEmail.subject,
                content: currentEmail.content,
                preview: currentEmail.preview,
              })
              setLastSaved(new Date())
            } else {
              console.error(
                'Email not found for save operation:',
                id,
                'Available:',
                emailsRef.current.map((e) => e.id),
              )
            }
          } catch (error) {
            console.error('Failed to save email to database:', error)
          } finally {
            setIsSaving(false)
          }
        }, EMAIL_SAVE_DEBOUNCE_MS)
      }
    },
    [emails, currentCampaignId, updateEmail, campaignService, versionStorageService],
  )

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [])

  // Automatic cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    saveEmail,
    isSaving,
    lastSaved,
    cleanup,
  }
}
