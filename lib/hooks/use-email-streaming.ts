'use client'

import { useCallback, useRef, useState } from 'react'
import { CampaignService, type GenerateEmailsStreamEvent } from '../services/campaign.service'
import { useCampaignActions } from '../campaign-context'
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

export function useEmailStreaming(): UseEmailStreamingReturn {
  const { appendGeneratedEmail, replaceGeneratedEmailsLocal } = useCampaignActions()

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedCount, setStreamedCount] = useState(0)
  const [totalExpected, setTotalExpected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limitPlan, setLimitPlan] = useState<PlanId | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const generateEmailsStream = useCallback(
    async (
      landingPageData: LandingPageData,
      config: CampaignConfig,
      campaignId: string | null,
    ): Promise<Email[] | null> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

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

      try {
        const handleEvent = (event: GenerateEmailsStreamEvent) => {
          if (event.type === 'start') {
            setTotalExpected(event.total)
          } else if (event.type === 'email') {
            if (!firstEmailFired) {
              firstEmailFired = true
              track('first_email_streamed', {
                campaignId: campaignId ?? undefined,
              })
            }
            appendGeneratedEmail(event.email)
            setStreamedCount((n) => n + 1)
          } else if (event.type === 'complete') {
            if (event.warning) setWarning(event.warning)
          } else if (event.type === 'error') {
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

        // Replace with the persisted versions (which carry server-assigned UUIDs
        // — needed for version tracking on subsequent edits).
        replaceGeneratedEmailsLocal(finalEmails)
        return finalEmails
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        if (err instanceof PlanLimitError) {
          setLimitPlan(err.plan)
          setError(err.message)
          track('limit_reached', { plan: err.plan, limit: 'campaigns' })
          return null
        }
        logError(err, {
          operation: 'generate emails (stream)',
          component: 'useEmailStreaming',
          campaignId: campaignId ?? undefined,
          additionalData: { landingUrl: landingPageData.url, config },
        })
        const message = getUserFriendlyMessage(err, 'generate emails')
        setError(message)
        return null
      } finally {
        setIsStreaming(false)
        abortRef.current = null
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
