'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaignData, useCampaignActions } from '@/lib/campaign-context'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'
import {
  CAMPAIGN_TONES,
  CAMPAIGN_TYPES,
  CAMPAIGN_DURATION,
} from '@/lib/constants/campaign'

interface CampaignConfig {
  tone: string
  campaignType: string
  days: number
}

export function useCampaignConfig(validCampaignId: string | null) {
  const router = useRouter()
  const { landingPageData, isLoading, currentCampaignId } = useCampaignData()

  const { setConfig, setGeneratedEmails, updateCampaignConfig, loadCampaign } =
    useCampaignActions()

  const { isGenerating, error, generateEmails } = useEmailGeneration()

  const [tone, setTone] = useState<string>(CAMPAIGN_TONES[0].value)
  const [campaignType, setCampaignType] = useState<string>(
    CAMPAIGN_TYPES[0].value
  )
  const [days, setDays] = useState<number[]>([CAMPAIGN_DURATION.DEFAULT])
  const [campaignLoaded, setCampaignLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load campaign from database if campaignId is in URL
  useEffect(() => {
    if (validCampaignId && !campaignLoaded && !isLoading) {
      loadCampaign(validCampaignId)
        .then(() => setCampaignLoaded(true))
        .catch((error) => {
          console.error('Failed to load campaign:', error)
          router.push('/campaigns')
        })
    }
  }, [validCampaignId, campaignLoaded, isLoading, loadCampaign, router])

  // Redirect if no landing page data
  useEffect(() => {
    if (isLoading) return
    if (validCampaignId && !campaignLoaded) return
    if (!landingPageData) {
      router.push('/create')
    }
  }, [landingPageData, router, isLoading, validCampaignId, campaignLoaded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!landingPageData) return

    setIsSubmitting(true)
    try {
      const config: CampaignConfig = {
        tone,
        campaignType,
        days: days[0],
      }

      await updateCampaignConfig(config)

      const emails = await generateEmails(
        landingPageData.url,
        landingPageData.content || '',
        config,
        currentCampaignId || undefined
      )

      if (emails) {
        setConfig(config)
        await setGeneratedEmails(emails)
        const editorUrl = currentCampaignId
          ? `/create/editor?campaign=${currentCampaignId}`
          : '/create/editor'
        router.push(editorUrl)
      }
    } finally {
      // Don't set false - let navigation complete
    }
  }

  const isReady =
    !isLoading && (!validCampaignId || campaignLoaded) && !!landingPageData

  return {
    // Form state
    tone,
    setTone,
    campaignType,
    setCampaignType,
    days,
    setDays,

    // Data
    landingPageData,
    currentCampaignId,

    // Loading states
    isLoading,
    isGenerating,
    isSubmitting,
    isReady,

    // Error
    error,

    // Actions
    handleSubmit,
  }
}
