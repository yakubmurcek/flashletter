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

  const { applyConfigToCampaign, createNewCampaign, loadCampaign } = useCampaignActions()
  const { plan, maxEmails } = usePlan()

  const { isGenerating, error: generationError, warning } = useEmailGeneration()

  const [tone, setTone] = useState<string>(
    CAMPAIGN_TONES[0]?.value ?? SMART_DEFAULT_CAMPAIGN_CONFIG.tone,
  )
  const [campaignType, setCampaignType] = useState<string>(
    CAMPAIGN_TYPES[0]?.value ?? SMART_DEFAULT_CAMPAIGN_CONFIG.campaignType,
  )
  // Same default as the hero flow, so it fits every plan's email limit.
  const [days, setDays] = useState<number[]>([SMART_DEFAULT_CAMPAIGN_CONFIG.days])
  const [campaignLoaded, setCampaignLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
    setDays((prev) => ((prev[0] ?? 0) > maxEmails ? [maxEmails] : prev))
  }, [maxEmails])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!landingPageData) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const config: CampaignConfig = {
        tone,
        campaignType,
        days: days[0] ?? SMART_DEFAULT_CAMPAIGN_CONFIG.days,
      }

      // Same path as the hero flow: save the settings and let the editor stream
      // the emails in (first email in seconds, plan limits shown in context).
      // No campaign yet (creating it failed on /create): create it now. Plans
      // count generations per saved campaign, so the server refuses one
      // without an id.
      const campaignId =
        validCampaignId || currentCampaignId || (await createNewCampaign(landingPageData))
      await applyConfigToCampaign(campaignId, config)
      router.push(`/create/editor?campaign=${campaignId}&email=1&autogen=1`)
      // Leave isSubmitting set while the editor loads.
    } catch (err) {
      console.error('Failed to start campaign:', err)
      setSubmitError('Could not save your campaign. Please try again.')
      setIsSubmitting(false)
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
    error: submitError ?? generationError,
    warning,

    // Actions
    handleSubmit,
  }
}
