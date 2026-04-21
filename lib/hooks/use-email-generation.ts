'use client'

import { useState, useRef } from 'react'
import { CampaignService } from '../services/campaign.service'
import type { CampaignConfig, GenerateEmailsResponse } from '../types'
import type { LandingPageAnalysis } from '../schemas/analysis'
import { logError, getUserFriendlyMessage } from '../utils/error-handling'

interface UseEmailGenerationReturn {
  isGenerating: boolean
  error: string | null
  warning: string | null
  generateEmails: (
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string,
    landingAnalysis?: LandingPageAnalysis,
  ) => Promise<GenerateEmailsResponse | null>
  clearError: () => void
  clearWarning: () => void
}

export function useEmailGeneration(): UseEmailGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateEmails = async (
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string,
    landingAnalysis?: LandingPageAnalysis,
  ): Promise<GenerateEmailsResponse | null> => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsGenerating(true)
    setError(null)
    setWarning(null)

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const result = await CampaignService.generateEmails(
        landingUrl,
        landingContent,
        config,
        campaignId,
        abortControllerRef.current.signal,
        landingAnalysis,
      )
      setWarning(result.warning ?? null)
      return result
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }

      // Log error with standardized format
      logError(err, {
        operation: 'generate emails',
        component: 'useEmailGeneration',
        campaignId,
        additionalData: { landingUrl, config },
      })

      const message = getUserFriendlyMessage(err, 'generate emails')
      setError(message)
      setWarning(null)
      return null
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const clearError = () => setError(null)
  const clearWarning = () => setWarning(null)

  return {
    isGenerating,
    error,
    warning,
    generateEmails,
    clearError,
    clearWarning,
  }
}
