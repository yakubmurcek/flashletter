'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign } from '@/lib/campaign-context'
import { useUrlState } from './use-url-state'

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error'

import type { LandingPageData, CampaignConfig, Email } from '@/lib/types'

interface CampaignLoaderReturn {
  loadingState: LoadingState
  campaignData: {
    name: string | null
    landingPageData: LandingPageData | null
    config: CampaignConfig | null
    emails: Email[]
  } | null
  error: string | null
  loadCampaign: (campaignId: string) => Promise<void>
}

export function useCampaignLoader(): CampaignLoaderReturn {
  const router = useRouter()
  const {
    campaignName,
    landingPageData,
    config,
    generatedEmails,
    isLoading,
    loadCampaign: contextLoadCampaign,
  } = useCampaign()
  const { getCampaignId, cleanupParams } = useUrlState()

  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)
  // Track which campaign we last loaded by id. Replaces the previous boolean
  // `campaignLoaded`, which never reset when the URL id changed — meaning
  // navigating from `?campaign=A` to `?campaign=B` quietly reused A's data.
  const [loadedCampaignId, setLoadedCampaignId] = useState<string | null>(null)

  const campaignIdFromUrl = getCampaignId()

  const loadCampaign = useCallback(
    async (campaignId: string) => {
      setLoadingState('loading')
      setError(null)

      try {
        await contextLoadCampaign(campaignId)
        setLoadedCampaignId(campaignId)
        setLoadingState('loaded')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign'
        setError(errorMessage)
        setLoadingState('error')

        // Clean up params and redirect on error
        cleanupParams([])
        router.push('/campaigns')
      }
    },
    [contextLoadCampaign, cleanupParams, router],
  )

  // Load campaign from URL when the id changes (or first appears).
  useEffect(() => {
    if (campaignIdFromUrl && campaignIdFromUrl !== loadedCampaignId && !isLoading) {
      loadCampaign(campaignIdFromUrl)
    }
  }, [campaignIdFromUrl, loadedCampaignId, isLoading, loadCampaign])

  // Determine loading state based on context
  useEffect(() => {
    if (isLoading) {
      setLoadingState('loading')
    } else if (campaignIdFromUrl && campaignIdFromUrl !== loadedCampaignId) {
      setLoadingState('loading')
    } else if (error) {
      setLoadingState('error')
    } else if (landingPageData || config || generatedEmails.length > 0) {
      setLoadingState('loaded')
    } else {
      setLoadingState('idle')
    }
  }, [
    isLoading,
    campaignIdFromUrl,
    loadedCampaignId,
    error,
    campaignName,
    landingPageData,
    config,
    generatedEmails.length,
  ])

  const campaignData =
    loadingState === 'loaded'
      ? {
          name: campaignName,
          landingPageData,
          config,
          emails: generatedEmails,
        }
      : null

  return {
    loadingState,
    campaignData,
    error,
    loadCampaign,
  }
}
