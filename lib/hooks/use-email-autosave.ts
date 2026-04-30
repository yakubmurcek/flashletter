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

type Snapshot = { subject: string; content: string }

/**
 * Per-email autosave with versioning that captures *pauses*, not keystrokes.
 *
 * The previous implementation saved a fresh `email_versions` row on every
 * call to `saveEmail` (i.e. every keystroke), then debounced only the DB
 * write. That meant 200 chars of typing produced ~200 version rows plus
 * an N+1 read on every one. This rewrite folds the version save into the
 * same debounce: when the timer fires we compare the email's current state
 * to the last-known snapshot, save the *snapshot* as a version (so it
 * represents the state the user was in before this typing burst), then
 * advance the snapshot. The `saveVersion` service still has its own
 * duplicate-content guard, so back-to-back identical pauses (e.g. after a
 * restore-from-history) won't insert duplicate rows.
 */
export function useEmailAutosave(
  emails: Email[],
  currentCampaignId: string | null,
  updateEmail: (id: number, updates: Partial<Email>) => void,
): EmailAutosaveReturn {
  const saveTimerRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const previousSnapshotRef = useRef<Map<number, Snapshot>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Latest emails array — read inside the deferred timer so the saved data
  // reflects the keystroke that fired the debounce, not whatever was in
  // scope when saveEmail was invoked.
  const emailsRef = useRef(emails)
  useEffect(() => {
    emailsRef.current = emails
  }, [emails])

  // Seed snapshots when an email first becomes visible. Only fill missing
  // entries — re-seeding on every render would clobber the snapshot the
  // debounce relies on.
  useEffect(() => {
    for (const email of emails) {
      if (!previousSnapshotRef.current.has(email.id)) {
        previousSnapshotRef.current.set(email.id, {
          subject: email.subject,
          content: email.content,
        })
      }
    }
  }, [emails])

  const supabase = createClient()
  const campaignService = useMemo(() => new CampaignStorageService(supabase), [supabase])
  const versionStorageService = useMemo(() => new EmailVersionStorageService(supabase), [supabase])

  const saveEmail = useCallback(
    async (id: number, updates: Partial<Email>, skipVersioning = false) => {
      // Apply locally immediately so the editor stays responsive.
      updateEmail(id, updates)

      if (!currentCampaignId) return

      // Reset any pending debounce for this email — only the latest paused
      // state for a given email gets persisted/versioned.
      const existingTimer = saveTimerRef.current.get(id)
      if (existingTimer) clearTimeout(existingTimer)

      const timer = setTimeout(async () => {
        saveTimerRef.current.delete(id)
        setIsSaving(true)
        try {
          const currentEmail = emailsRef.current.find((e) => e.id === id)
          if (!currentEmail) return

          if (!skipVersioning && currentEmail.uuid) {
            const snapshot = previousSnapshotRef.current.get(id)
            if (
              snapshot &&
              (snapshot.subject !== currentEmail.subject ||
                snapshot.content !== currentEmail.content)
            ) {
              try {
                await versionStorageService.saveVersion(
                  currentEmail.uuid,
                  currentEmail.day,
                  snapshot,
                )
              } catch (error) {
                console.error('Failed to save version:', error)
                // Continue with the DB update even if versioning fails.
              }
              previousSnapshotRef.current.set(id, {
                subject: currentEmail.subject,
                content: currentEmail.content,
              })
            }
          }

          await campaignService.updateEmail(currentCampaignId, id, {
            subject: currentEmail.subject,
            content: currentEmail.content,
            preview: currentEmail.preview,
          })
          setLastSaved(new Date())
        } catch (error) {
          console.error('Failed to save email to database:', error)
        } finally {
          setIsSaving(false)
        }
      }, EMAIL_SAVE_DEBOUNCE_MS)

      saveTimerRef.current.set(id, timer)
    },
    [currentCampaignId, updateEmail, campaignService, versionStorageService],
  )

  const cleanup = useCallback(() => {
    for (const timer of saveTimerRef.current.values()) {
      clearTimeout(timer)
    }
    saveTimerRef.current.clear()
  }, [])

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
