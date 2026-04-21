'use client'

import { useState, useRef, useEffect } from 'react'
import { CampaignService } from '../services/campaign.service'
import type { LandingPageData } from '../types'
import { ProgressState, SCRAPE_PROGRESS_STAGES, getCleanDomain } from '../types/scrape-progress'

const FALLBACK_TITLE = 'Landing Page'

interface UseLandingPageReturn {
  isAnalyzing: boolean
  progressState: ProgressState
  error: string | null
  analyzeLandingPage: (url: string) => Promise<LandingPageData | null>
  clearError: () => void
}

export function useLandingPage(): UseLandingPageReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressState, setProgressState] = useState<ProgressState>({
    currentStageId: SCRAPE_PROGRESS_STAGES[0].id,
    completedStageIds: [],
    dynamicContext: {},
  })

  // Refs for tracking timeouts to allow cleanup
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  const startProgressSimulation = (url: string) => {
    // Reset state
    const domain = getCleanDomain(url)

    setProgressState({
      currentStageId: SCRAPE_PROGRESS_STAGES[0].id,
      completedStageIds: [],
      dynamicContext: { domain },
    })

    let accumulatedTime = 0
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    // Schedule stage transitions
    SCRAPE_PROGRESS_STAGES.forEach((stage, index) => {
      // Don't schedule the last one automatically (it waits for completion)
      if (index === SCRAPE_PROGRESS_STAGES.length - 1) return

      const nextStage = SCRAPE_PROGRESS_STAGES[index + 1]
      accumulatedTime += stage.minDuration

      const timeout = setTimeout(() => {
        setProgressState((prev) => ({
          ...prev,
          completedStageIds: [...prev.completedStageIds, stage.id],
          currentStageId: nextStage.id,
        }))
      }, accumulatedTime)

      timeoutsRef.current.push(timeout)
    })
  }

  const analyzeLandingPage = async (url: string): Promise<LandingPageData | null> => {
    setIsAnalyzing(true)
    setError(null)
    startProgressSimulation(url)

    try {
      const data = await CampaignService.scrapeLandingPage(url)

      // Update context with real data once available
      if (data?.metadata?.title) {
        setProgressState((prev) => ({
          ...prev,
          dynamicContext: {
            ...prev.dynamicContext,
            title: data.metadata?.title || FALLBACK_TITLE,
          },
        }))
      }

      // Fast-forward to completion
      timeoutsRef.current.forEach(clearTimeout)

      // Complete all stages rapidly
      setProgressState((prev) => ({
        ...prev,
        completedStageIds: SCRAPE_PROGRESS_STAGES.map((s) => s.id),
        currentStageId: 'completed',
      }))

      // Small delay to let user see "completed" state before navigating
      await new Promise((resolve) => setTimeout(resolve, 800))

      return data
    } catch (err) {
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
