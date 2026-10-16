'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CampaignService,
  RateLimitedError,
  type GenerateEmailsStreamEvent,
} from '../services/campaign.service'
import { CampaignStorageService } from '../services/campaign-storage.service'
import { createClient } from '../supabase/client'
import { useCampaignActions, useCampaignData } from '../campaign-context'
import type { CampaignConfig, Email, LandingPageData } from '../types'
import { logError, getUserFriendlyMessage } from '../utils/error-handling'
import { track } from '../analytics'
import { PlanLimitError } from '../billing/errors'
import type { PlanId } from '../billing/plans'

interface UseEmailStreamingReturn {
  isStreaming: boolean
  streamedCount: number
  totalExpected: number | null
  error: string | null
  /** Set when generation was refused because the plan limit was reached. */
  limitPlan: PlanId | null
  warning: string | null
  generateEmailsStream: (
    landingPageData: LandingPageData,
    config: CampaignConfig,
    campaignId: string | null,
  ) => Promise<Email[] | null>
  clearError: () => void
  clearWarning: () => void
}

type EmailText = Pick<Email, 'subject' | 'content' | 'preview'>

/** One generateEmailsStream call. Only the live session may touch state. */
interface StreamSession {
  controller: AbortController
  campaignId: string | null
  /** Context campaign id when the stream started; it can still be lagging. */
  contextCampaignId: string | null
  /** What the stream showed per day, to tell user edits from streamed text. */
  streamed: Map<number, EmailText>
}

const textOf = (email: EmailText): EmailText => ({
  subject: email.subject,
  content: email.content,
  preview: email.preview,
})

const sameText = (a: EmailText, b: EmailText) =>
  a.subject === b.subject && a.content === b.content && a.preview === b.preview

// first_email_streamed measures time to the first email of a campaign, so a
// regenerate (same campaign, same browser) must not count again.
const FIRST_STREAMED_KEY = 'fl_analytics_first_streamed'
const firstStreamedInMemory = new Set<string>()

function claimFirstEmailStreamed(campaignId: string | null): boolean {
  if (!campaignId) return true
  if (firstStreamedInMemory.has(campaignId)) return false
  firstStreamedInMemory.add(campaignId)
  try {
    const seen: unknown = JSON.parse(window.localStorage.getItem(FIRST_STREAMED_KEY) ?? '[]')
    const ids = Array.isArray(seen) ? (seen as string[]) : []
    if (ids.includes(campaignId)) return false
    window.localStorage.setItem(
      FIRST_STREAMED_KEY,
      JSON.stringify([...ids, campaignId].slice(-200)),
    )
  } catch {
    // Storage unavailable: the in-memory set still dedupes this page session.
  }
  return true
}

/** Writes the edits; resolves to how many of them could not be saved. */
async function persistEdits(campaignId: string, emails: Email[]): Promise<number> {
  const storage = new CampaignStorageService(createClient())
  let failed = 0
  for (const email of emails) {
    try {
      await storage.updateEmail(campaignId, email.day, textOf(email))
    } catch (err) {
      failed++
      logError(err, {
        operation: 'save edit made during generation',
        component: 'useEmailStreaming',
        campaignId,
      })
    }
  }
  return failed
}

const EDITS_NOT_SAVED_WARNING =
  'An edit you made while the sequence was generating was not saved. Check the email and make it again.'

export function useEmailStreaming(): UseEmailStreamingReturn {
  const { appendGeneratedEmail, replaceGeneratedEmailsLocal } = useCampaignActions()
  const { generatedEmails, currentCampaignId } = useCampaignData()

  // The emails on screen right now, read when the server's batch lands.
  const localEmailsRef = useRef(generatedEmails)
  localEmailsRef.current = generatedEmails
  const currentCampaignIdRef = useRef(currentCampaignId)
  currentCampaignIdRef.current = currentCampaignId

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedCount, setStreamedCount] = useState(0)
  const [totalExpected, setTotalExpected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limitPlan, setLimitPlan] = useState<PlanId | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const sessionRef = useRef<StreamSession | null>(null)
  const unmountedRef = useRef(false)

  // Detach the live stream: its events stop reaching state. The request
  // itself keeps running so the server still saves that campaign's emails
  // (the route stops, unsaved, once the client aborts).
  const detach = useCallback(() => {
    sessionRef.current = null
    setIsStreaming(false)
    setStreamedCount(0)
    setTotalExpected(null)
  }, [])

  // Another campaign opened in this editor: the stream is not for it.
  useEffect(() => {
    const session = sessionRef.current
    if (
      session &&
      currentCampaignId !== session.campaignId &&
      currentCampaignId !== session.contextCampaignId
    ) {
      detach()
    }
  }, [currentCampaignId, detach])

  // The editor unmounted (user left, or opened another campaign). A flag
  // rather than dropping the session, so StrictMode's dev remount survives.
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  const generateEmailsStream = useCallback(
    async (
      landingPageData: LandingPageData,
      config: CampaignConfig,
      campaignId: string | null,
    ): Promise<Email[] | null> => {
      sessionRef.current?.controller.abort()
      const controller = new AbortController()
      const session: StreamSession = {
        controller,
        campaignId,
        contextCampaignId: currentCampaignIdRef.current,
        streamed: new Map(),
      }
      sessionRef.current = session
      const isLive = () => !unmountedRef.current && sessionRef.current === session

      setIsStreaming(true)
      setStreamedCount(0)
      setTotalExpected(config.days)
      setError(null)
      setLimitPlan(null)
      setWarning(null)

      // Clear any prior emails locally so the stream renders cleanly.
      replaceGeneratedEmailsLocal([])

      // One-shot per stream session: fire on the *first* email arriving so
      // the funnel can measure time-to-first-email separately from total
      // generation time. Reset on each new stream invocation (the closure
      // is fresh per call).
      let firstEmailFired = false
      // The server's own message for a failed run; shown as is.
      let serverErrorMessage: string | null = null

      try {
        const handleEvent = (event: GenerateEmailsStreamEvent) => {
          if (!isLive()) return
          if (event.type === 'start') {
            setTotalExpected(event.total)
          } else if (event.type === 'email') {
            if (!firstEmailFired) {
              firstEmailFired = true
              if (claimFirstEmailStreamed(campaignId))
                track('first_email_streamed', {
                  campaignId: campaignId ?? undefined,
                })
            }
            session.streamed.set(event.email.day, textOf(event.email))
            appendGeneratedEmail(event.email)
            setStreamedCount((n) => n + 1)
          } else if (event.type === 'complete') {
            if (event.warning) setWarning(event.warning)
          } else if (event.type === 'error') {
            serverErrorMessage = event.message
            setError(event.message)
          }
        }

        const finalEmails = await CampaignService.generateEmailsStream(
          landingPageData.url,
          landingPageData.content || '',
          config,
          handleEvent,
          {
            campaignId: campaignId || undefined,
            signal: controller.signal,
            landingAnalysis: landingPageData.analysis,
          },
        )

        if (!isLive()) return null

        // Replace with the persisted versions (which carry server-assigned UUIDs
        // — needed for version tracking on subsequent edits). An email the
        // user edited while the rest streamed keeps the user's text.
        const edited: Email[] = []
        const merged = finalEmails.map((serverEmail) => {
          const streamed = session.streamed.get(serverEmail.day)
          const local = localEmailsRef.current.find((e) => e.day === serverEmail.day)
          if (!streamed || !local || sameText(local, streamed)) return serverEmail
          const kept = { ...serverEmail, ...textOf(local) }
          edited.push(kept)
          return kept
        })
        replaceGeneratedEmailsLocal(merged)
        // Make sure the kept edits are what the database holds: the server
        // writes Day 1's streamed text again when its early save failed.
        if (campaignId && edited.length > 0) {
          void persistEdits(campaignId, edited).then((failed) => {
            // Still this campaign, and no newer run has started.
            const shown = currentCampaignIdRef.current
            const sameCampaign = shown === campaignId || shown === session.contextCampaignId
            if (failed > 0 && !unmountedRef.current && !sessionRef.current && sameCampaign) {
              setWarning(EDITS_NOT_SAVED_WARNING)
            }
          })
        }
        return merged
      } catch (err) {
        if (!isLive() || (err instanceof Error && err.name === 'AbortError')) {
          return null
        }
        if (err instanceof PlanLimitError) {
          setLimitPlan(err.plan)
          setError(err.message)
          track('limit_reached', { plan: err.plan, limit: err.limit })
          return null
        }
        if (err instanceof RateLimitedError) {
          setError(err.message)
          return null
        }
        logError(err, {
          operation: 'generate emails (stream)',
          component: 'useEmailStreaming',
          campaignId: campaignId ?? undefined,
          additionalData: { landingUrl: landingPageData.url, config },
        })
        setError(serverErrorMessage ?? getUserFriendlyMessage(err, 'generate emails'))
        return null
      } finally {
        if (isLive()) {
          setIsStreaming(false)
          sessionRef.current = null
        }
      }
    },
    [appendGeneratedEmail, replaceGeneratedEmailsLocal],
  )

  const clearError = useCallback(() => setError(null), [])
  const clearWarning = useCallback(() => setWarning(null), [])

  return {
    isStreaming,
    streamedCount,
    totalExpected,
    error,
    limitPlan,
    warning,
    generateEmailsStream,
    clearError,
    clearWarning,
  }
}
