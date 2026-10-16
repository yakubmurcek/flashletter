'use client'

import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import { EMAIL_SAVE_DEBOUNCE_MS } from '@/lib/constants/app'
import type { Email } from '@/lib/types'
import { track } from '@/lib/analytics'

interface EmailAutosaveReturn {
  saveEmail: (id: number, updates: Partial<Email>, skipVersioning?: boolean) => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
  /** Why the last write failed; null once a write works again. */
  saveError: string | null
  cleanup: () => void
}

type Snapshot = { subject: string; content: string }

// Email ids are day numbers, 1..N in every campaign, so anything kept per
// email is keyed by campaign too.
const emailKey = (campaignId: string | null, id: number) => `${campaignId ?? ''}:${id}`

// Matched by name: tests mock the storage module without its error classes.
const saveErrorMessage = (error: unknown) =>
  error instanceof Error && error.name === 'EmailNotSavedError'
    ? 'This email was not saved, so your edits to it are not kept. Copy anything you need, then generate the sequence again.'
    : 'Could not save your last edit. Check your connection; it saves again on your next change.'

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
  // The write each pending timer will run, so unmounting can run it now.
  const pendingWriteRef = useRef<Map<number, () => Promise<void>>>(new Map())
  const previousSnapshotRef = useRef<Map<string, Snapshot>>(new Map())
  // Tracks which emails (campaign + id) have already fired `email_edited`
  // this hook lifetime. Persists across re-renders without triggering them,
  // and resets naturally if the user navigates away and back.
  const trackedEditsRef = useRef<Set<string>>(new Set())
  // Writes started but not finished. `isSaving` covers these and the ones
  // still waiting out the debounce, so the UI never says "Saved" early.
  const inFlightRef = useRef(0)
  const [inFlight, setInFlight] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const isSaving = inFlight > 0 || pendingCount > 0
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // A write flushed while switching campaigns finishes after the switch;
  // its result must not show up on the next campaign.
  const currentCampaignIdRef = useRef(currentCampaignId)
  currentCampaignIdRef.current = currentCampaignId
  useEffect(() => {
    setSaveError(null)
  }, [currentCampaignId])

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
      const key = emailKey(currentCampaignId, email.id)
      if (!previousSnapshotRef.current.has(key)) {
        previousSnapshotRef.current.set(key, {
          subject: email.subject,
          content: email.content,
        })
      }
    }
  }, [emails, currentCampaignId])

  const supabase = createClient()
  const campaignService = useMemo(() => new CampaignStorageService(supabase), [supabase])
  const versionStorageService = useMemo(() => new EmailVersionStorageService(supabase), [supabase])

  const saveEmail = useCallback(
    async (id: number, updates: Partial<Email>, skipVersioning = false) => {
      // Apply locally immediately so the editor stays responsive.
      updateEmail(id, updates)
      // And to the ref the write reads: after the page unmounts it never
      // re-renders, so the ref would otherwise still hold the old text.
      emailsRef.current = emailsRef.current.map((e) => (e.id === id ? { ...e, ...updates } : e))

      if (!currentCampaignId) return

      // Reset any pending debounce for this email — only the latest paused
      // state for a given email gets persisted/versioned.
      const existingTimer = saveTimerRef.current.get(id)
      if (existingTimer) clearTimeout(existingTimer)

      const isCurrentCampaign = () => currentCampaignIdRef.current === currentCampaignId
      const write = async () => {
        saveTimerRef.current.delete(id)
        pendingWriteRef.current.delete(id)
        setPendingCount(pendingWriteRef.current.size)
        inFlightRef.current += 1
        setInFlight(inFlightRef.current)
        try {
          const currentEmail = emailsRef.current.find((e) => e.id === id)
          if (!currentEmail) return

          if (!skipVersioning && currentEmail.uuid) {
            const snapshot = previousSnapshotRef.current.get(emailKey(currentCampaignId, id))
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
              previousSnapshotRef.current.set(emailKey(currentCampaignId, id), {
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
          if (isCurrentCampaign()) setSaveError(null)

          // Fire once per (email id, hook lifetime). The funnel cares about
          // "did the user actually engage with the editor for this day," not
          // raw keystroke volume, and the snapshot guard above means we only
          // get here when the content genuinely changed.
          const editKey = emailKey(currentCampaignId, id)
          if (!trackedEditsRef.current.has(editKey) && !skipVersioning) {
            trackedEditsRef.current.add(editKey)
            track('email_edited', { day: currentEmail.day })
          }
        } catch (error) {
          console.error('Failed to save email to database:', error)
          // No retry here: the next edit writes again, so a failure can't loop.
          if (isCurrentCampaign()) setSaveError(saveErrorMessage(error))
        } finally {
          inFlightRef.current -= 1
          setInFlight(inFlightRef.current)
        }
      }

      // The tab is going away: the debounce would never fire, write now.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        pendingWriteRef.current.delete(id)
        setPendingCount(pendingWriteRef.current.size)
        await write()
        return
      }

      saveTimerRef.current.set(id, setTimeout(write, EMAIL_SAVE_DEBOUNCE_MS))
      pendingWriteRef.current.set(id, write)
      setPendingCount(pendingWriteRef.current.size)
    },
    [currentCampaignId, updateEmail, campaignService, versionStorageService],
  )

  const cleanup = useCallback(() => {
    for (const timer of saveTimerRef.current.values()) {
      clearTimeout(timer)
    }
    saveTimerRef.current.clear()
    pendingWriteRef.current.clear()
    setPendingCount(0)
  }, [])

  // Closing or hiding the tab inside the debounce window: write now, and ask
  // the browser to hold the page while a write is still on its way.
  useEffect(() => {
    const flush = () => {
      for (const timer of saveTimerRef.current.values()) clearTimeout(timer)
      saveTimerRef.current.clear()
      const pending = [...pendingWriteRef.current.values()]
      pendingWriteRef.current.clear()
      for (const write of pending) void write()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const unsaved = pendingWriteRef.current.size > 0 || inFlightRef.current > 0
      flush()
      if (unsaved) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Leaving the editor, or opening another campaign in it, inside the
  // debounce window: write now, don't drop it. This cleanup runs before the
  // emails ref takes the next campaign's list, so the write reads its own
  // campaign's text.
  useEffect(() => {
    const timers = saveTimerRef.current
    const writes = pendingWriteRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      const pending = [...writes.values()]
      writes.clear()
      for (const write of pending) void write()
    }
  }, [currentCampaignId])

  return {
    saveEmail,
    isSaving,
    lastSaved,
    saveError,
    cleanup,
  }
}
