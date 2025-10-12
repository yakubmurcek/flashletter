import { useState } from 'react'
import { CampaignService } from '../services/campaign.service'
import type { CampaignConfig, Email } from '../types'

interface UseEmailGenerationReturn {
  isGenerating: boolean
  error: string | null
  generateEmails: (
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string
  ) => Promise<Email[] | null>
  clearError: () => void
}

export function useEmailGeneration(): UseEmailGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateEmails = async (
    landingUrl: string,
    landingContent: string,
    config: CampaignConfig,
    campaignId?: string
  ): Promise<Email[] | null> => {
    setIsGenerating(true)
    setError(null)

    try {
      const emails = await CampaignService.generateEmails(
        landingUrl,
        landingContent,
        config,
        campaignId
      )
      return emails
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to generate emails. Please make sure your OpenAI API key is configured and try again.'
      setError(message)
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const clearError = () => setError(null)

  return { isGenerating, error, generateEmails, clearError }
}
