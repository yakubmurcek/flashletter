'use client'

import { useState, useRef, useEffect } from 'react'
import { CampaignService } from '../services/campaign.service'
import type { LandingPageData } from '../types'
import {
  ProgressState,
  ProgressStageId,
  SCRAPE_PROGRESS_STAGES,
  ScrapeStreamEvent,
  getCleanDomain,
} from '../types/scrape-progress'

interface UseLandingPageReturn {
  isAnalyzing: boolean
  progressState: ProgressState
  error: string | null
  analyzeLandingPage: (url: string) => Promise<LandingPageData | null>
  clearError: () => void
}

const initialState: ProgressState = {
  currentStageId: SCRAPE_PROGRESS_STAGES[0].id,
  completedStageIds: [],
  dynamicContext: {},
}

export function useLandingPage(): UseLandingPageReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressState, setProgressState] = useState<ProgressState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const analyzeLandingPage = async (url: string): Promise<LandingPageData | null> => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsAnalyzing(true)
    setError(null)
    setProgressState({
      currentStageId: SCRAPE_PROGRESS_STAGES[0].id,
      completedStageIds: [],
      dynamicContext: { domain: getCleanDomain(url) },
    })

    const advanceTo = (nextStageId: Exclude<ProgressStageId, 'completed'>) => {
      setProgressState((prev) => {
        if (prev.currentStageId === nextStageId) return prev
        const completed = prev.completedStageIds.includes(prev.currentStageId)
          ? prev.completedStageIds
          : [...prev.completedStageIds, prev.currentStageId]
        return {
          ...prev,
          currentStageId: nextStageId,
          completedStageIds: completed,
        }
      })
    }

    const mergeContext = (patch: ProgressState['dynamicContext']) => {
      setProgressState((prev) => ({
        ...prev,
        dynamicContext: { ...prev.dynamicContext, ...patch },
      }))
    }

    try {
      const handleEvent = (event: ScrapeStreamEvent) => {
        if (event.type === 'stage') {
          if (event.context) mergeContext(event.context)
          advanceTo(event.stageId)
        } else if (event.type === 'error') {
          setError(event.message)
        }
      }

      const data = await CampaignService.scrapeLandingPageStream(
        url,
        handleEvent,
        controller.signal,
      )

      setProgressState((prev) => ({
        ...prev,
        completedStageIds: SCRAPE_PROGRESS_STAGES.map((s) => s.id),
        currentStageId: 'completed',
        dynamicContext: {
          ...prev.dynamicContext,
          title: data.metadata?.title || prev.dynamicContext.title,
          siteName: data.metadata?.ogSiteName || prev.dynamicContext.siteName,
        },
      }))

      // Brief pause so the user sees the "complete" state before navigation.
      // Resolves early on abort so the caller doesn't keep working after unmount.
      await new Promise<void>((resolve) => {
        if (controller.signal.aborted) return resolve()
        const timeout = setTimeout(resolve, 400)
        controller.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
      })

      if (controller.signal.aborted) return null

      return data
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return null
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to analyze landing page. Please check the URL and try again.'
      setError(message)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearError = () => setError(null)

  return { isAnalyzing, progressState, error, analyzeLandingPage, clearError }
}
