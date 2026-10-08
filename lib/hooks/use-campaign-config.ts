'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaignData, useCampaignActions } from '@/lib/campaign-context'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'
import {
  CAMPAIGN_TONES,
  CAMPAIGN_TYPES,
  SMART_DEFAULT_CAMPAIGN_CONFIG,
} from '@/lib/constants/campaign'
import { usePlan } from '@/lib/hooks/use-plan'

interface CampaignConfig {
  tone: string
  campaignType: string
  days: number
}

export function useCampaignConfig(validCampaignId: string | null) {
  const router = useRouter()
  const { landingPageData, isLoading, currentCampaignId } = useCampaignData()

  const {
    setConfig,
    setGeneratedEmails,
    updateCampaignConfig,
    applyConfigToCampaign,
    loadCampaign,
  } = useCampaignActions()
  const { plan, maxEmails } = usePlan()

  const { isGenerating, error, warning, generateEmails } = useEmailGeneration()

  const [tone, setTone] = useState<string>(CAMPAIGN_TONES[0].value)
  const [campaignType, setCampaignType] = useState<string>(CAMPAIGN_TYPES[0].value)
  // Same default as the hero flow, so it fits every plan's email limit.
  const [days, setDays] = useState<number[]>([SMART_DEFAULT_CAMPAIGN_CONFIG.days])
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

  // Never offer more emails than the plan can generate (the server answers 402).
  useEffect(() => {
    setDays((prev) => (prev[0] > maxEmails ? [maxEmails] : prev))
  }, [maxEmails])

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

      // Same path as the hero flow: save the settings and let the editor stream
      // the emails in (first email in seconds, plan limits shown in context).
      const campaignId = validCampaignId || currentCampaignId
      if (campaignId) {
        await applyConfigToCampaign(campaignId, config)
        router.push(`/create/editor?campaign=${campaignId}&email=1&autogen=1`)
        return
      }

      await updateCampaignConfig(config)

      const result = await generateEmails(
        landingPageData.url,
        landingPageData.content || '',
        config,
        currentCampaignId || undefined,
        landingPageData.analysis,
      )

      if (result) {
        setConfig(config)
        await setGeneratedEmails(result.emails)
        const editorUrl = currentCampaignId
          ? `/create/editor?campaign=${currentCampaignId}`
          : '/create/editor'
        router.push(editorUrl)
      }
    } finally {
      // Don't set false - let navigation complete
    }
  }

  const isReady = !isLoading && (!validCampaignId || campaignLoaded) && !!landingPageData

  return {
    // Form state
    tone,
    setTone,
    campaignType,
    setCampaignType,
    days,
    setDays,
    maxEmails,
    plan,

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
    warning,

    // Actions
    handleSubmit,
  }
}
