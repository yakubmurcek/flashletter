'use client'

import { useState } from 'react'
import { CampaignService } from '../services/campaign.service'
import type { LandingPageData } from '../types'

interface UseLandingPageReturn {
  isAnalyzing: boolean
  error: string | null
  analyzeLandingPage: (url: string) => Promise<LandingPageData | null>
  clearError: () => void
}

export function useLandingPage(): UseLandingPageReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeLandingPage = async (url: string): Promise<LandingPageData | null> => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const data = await CampaignService.scrapeLandingPage(url)
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

  return { isAnalyzing, error, analyzeLandingPage, clearError }
}
