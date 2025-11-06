'use client'

import { useState, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { createClient } from '../supabase/client'
import { CampaignStorageService } from '../services/campaign-storage.service'
import type { CampaignConfig, LandingPageData, Email } from '../types'
import { debounce } from '../utils/debounce'
import { logError } from '../utils/error-handling'
import { CampaignActionsContext, CampaignDataContext } from './contexts'

function extractTitleFromContent(html?: string | null): string | null {
  if (!html || typeof window === 'undefined' || !('DOMParser' in window)) {
    return null
  }

  try {
    const parser = new window.DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const title = doc.querySelector('title')?.textContent?.trim()
    return title ? title : null
  } catch {
    return null
  }
}

function deriveCampaignName(data?: LandingPageData | null): string | null {
  if (!data) return null

  const contentTitle = extractTitleFromContent(data.content)
  if (contentTitle) return contentTitle

  const meta = data.metadata
  const candidates = [
    meta?.title,
    meta?.ogTitle,
    meta?.twitterTitle,
    meta?.ogSiteName,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) return trimmed
    }
  }

  if (data.url) {
    try {
      const hostname = new URL(data.url).hostname.replace(/^www\./, '')
      if (hostname.trim()) {
        return hostname
      }
    } catch {
      // Ignore URL parsing errors and fall through to default
    }
  }

  return null
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(
    null
  )
  const [campaignName, setCampaignName] = useState<string | null>(null)
  const [landingPageData, setLandingPageDataState] =
    useState<LandingPageData | null>(null)
  const [config, setConfigState] = useState<CampaignConfig | null>(null)
  const [generatedEmails, setGeneratedEmailsState] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const campaignService = useMemo(
    () => new CampaignStorageService(supabase),
    [supabase]
  )

  const debouncedSaveLandingPage = useRef(
    debounce(async (campaignId: string, data: LandingPageData) => {
      try {
        await campaignService.updateCampaign(campaignId, {
          landingPageUrl: data.url,
          landingPageContent: data.content,
          landingPageMetadata: data.metadata,
        })
      } catch (error) {
        logError(error, {
          operation: 'auto-save landing page data',
          component: 'CampaignContext',
          campaignId,
          additionalData: { url: data.url },
        })
      }
    }, 1000)
  ).current

  const debouncedSaveConfig = useRef(
    debounce(async (campaignId: string, cfg: CampaignConfig) => {
      try {
        await campaignService.updateCampaign(campaignId, {
          tone: cfg.tone,
          campaignType: cfg.campaignType,
          days: cfg.days,
        })
      } catch (error) {
        logError(error, {
          operation: 'auto-save campaign config',
          component: 'CampaignContext',
          campaignId,
          additionalData: {
            tone: cfg.tone,
            campaignType: cfg.campaignType,
            days: cfg.days,
          },
        })
      }
    }, 1000)
  ).current

  const createNewCampaign = useCallback(
    async (
      providedLandingPageData?: LandingPageData | null
    ): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const dataToUse = providedLandingPageData || landingPageData
      const derivedName =
        deriveCampaignName(dataToUse) || 'New Campaign'

      const campaign = await campaignService.createCampaign(user.id, {
        name: derivedName,
        landingPageUrl: dataToUse?.url,
        landingPageContent: dataToUse?.content,
        landingPageMetadata: dataToUse?.metadata,
      })

      setCurrentCampaignId(campaign.id)
      setCampaignName(campaign.name ?? derivedName)
      return campaign.id
    },
    [supabase, campaignService, landingPageData, setCampaignName]
  )

  const loadCampaign = useCallback(
    async (campaignId: string) => {
      setIsLoading(true)
      try {
        const campaign = await campaignService.getCampaign(campaignId)
        if (!campaign) {
          throw new Error('Campaign not found')
        }

        setCurrentCampaignId(campaign.id)
        const landingData: LandingPageData = campaign.landing_page_url
          ? {
              url: campaign.landing_page_url,
              content: campaign.landing_page_content || undefined,
              metadata: campaign.landing_page_metadata,
            }
          : {
              url: 'https://example.com',
              content: 'Landing page content not available',
              metadata: {
                title: 'Campaign Landing Page',
                description: 'Landing page data not available',
              },
            }

        setLandingPageDataState(landingData)

        const rawName = typeof campaign.name === 'string'
          ? campaign.name.trim()
          : ''
        const derivedFromMeta = deriveCampaignName(landingData)
        const nameToUse =
          rawName && !['New Campaign', 'Untitled Campaign'].includes(rawName)
            ? rawName
            : derivedFromMeta || rawName || null

        setCampaignName(nameToUse ?? null)

        if (campaign.tone && campaign.campaign_type && campaign.days) {
          setConfigState({
            tone: campaign.tone,
            campaignType: campaign.campaign_type,
            days: campaign.days,
          })
        } else {
          setConfigState({
            tone: campaign.tone || 'professional',
            campaignType: campaign.campaign_type || 'welcome',
            days: campaign.days || 7,
          })
        }

        if (campaign.emails && campaign.emails.length > 0) {
          setGeneratedEmailsState(campaign.emails)
        } else {
          const defaultEmail = {
            id: 1,
            day: 1,
            subject: 'Welcome to our newsletter',
            preview: 'Thank you for subscribing!',
            content:
              "Welcome to our newsletter. We're excited to have you on board!",
          }
          setGeneratedEmailsState([defaultEmail])
        }
      } finally {
        setIsLoading(false)
      }
    },
    [campaignService]
  )

  const saveCampaign = useCallback(async () => {
    if (!currentCampaignId) return
    await campaignService.updateCampaign(currentCampaignId, {
      landingPageUrl: landingPageData?.url,
      landingPageContent: landingPageData?.content,
      landingPageMetadata: landingPageData?.metadata,
      tone: config?.tone,
      campaignType: config?.campaignType,
      days: config?.days,
    })
    if (generatedEmails.length > 0) {
      const savedEmails = await campaignService.saveEmails(
        currentCampaignId,
        generatedEmails
      )
      setGeneratedEmailsState(savedEmails)
    }
  }, [
    currentCampaignId,
    campaignService,
    landingPageData,
    config,
    generatedEmails,
  ])

  const updateCampaignConfig = useCallback(
    async (newConfig: CampaignConfig) => {
      setConfigState(newConfig)
      if (currentCampaignId) {
        await campaignService.updateCampaign(currentCampaignId, {
          tone: newConfig.tone,
          campaignType: newConfig.campaignType,
          days: newConfig.days,
        })
      }
    },
    [currentCampaignId, campaignService]
  )

  const setLandingPageData = useCallback(
    (data: LandingPageData | null) => {
      setLandingPageDataState(data)
      if (currentCampaignId && data) {
        debouncedSaveLandingPage(currentCampaignId, data)
      }
    },
    [currentCampaignId, debouncedSaveLandingPage]
  )

  const setConfig = useCallback(
    (cfg: CampaignConfig | null) => {
      setConfigState(cfg)
      if (currentCampaignId && cfg) {
        debouncedSaveConfig(currentCampaignId, cfg)
      }
    },
    [currentCampaignId, debouncedSaveConfig]
  )

  const setGeneratedEmails = useCallback(
    async (emails: Email[]) => {
      if (currentCampaignId && emails.length > 0) {
        try {
          const savedEmails = await campaignService.saveEmails(
            currentCampaignId,
            emails
          )
          setGeneratedEmailsState(savedEmails)
        } catch (error) {
          logError(error, {
            operation: 'auto-save generated emails',
            component: 'CampaignContext',
            campaignId: currentCampaignId,
            additionalData: { emailCount: emails.length },
          })
          setGeneratedEmailsState(emails)
        }
      } else {
        setGeneratedEmailsState(emails)
      }
    },
    [currentCampaignId, campaignService]
  )

  const updateEmail = useCallback((id: number, updates: Partial<Email>) => {
    setGeneratedEmailsState((prevEmails) =>
      prevEmails.map((email) =>
        email.id === id ? { ...email, ...updates } : email
      )
    )
  }, [])

  const clearAll = useCallback(() => {
    debouncedSaveLandingPage.cancel()
    debouncedSaveConfig.cancel()
    setCurrentCampaignId(null)
    setCampaignName(null)
    setLandingPageDataState(null)
    setConfigState(null)
    setGeneratedEmailsState([])
  }, [debouncedSaveLandingPage, debouncedSaveConfig, setCampaignName])

  const dataContextValue = useMemo(
    () => ({
      currentCampaignId,
      campaignName,
      landingPageData,
      config,
      generatedEmails,
      isLoading,
    }),
    [
      currentCampaignId,
      campaignName,
      landingPageData,
      config,
      generatedEmails,
      isLoading,
    ]
  )

  const actionsContextValue = useMemo(
    () => ({
      setLandingPageData,
      setConfig,
      setGeneratedEmails,
      updateEmail,
      loadCampaign,
      saveCampaign,
      createNewCampaign,
      updateCampaignConfig,
      clearAll,
    }),
    [
      setLandingPageData,
      setConfig,
      setGeneratedEmails,
      updateEmail,
      loadCampaign,
      saveCampaign,
      createNewCampaign,
      updateCampaignConfig,
      clearAll,
    ]
  )

  return (
    <CampaignDataContext.Provider value={dataContextValue}>
      <CampaignActionsContext.Provider value={actionsContextValue}>
        {children}
      </CampaignActionsContext.Provider>
    </CampaignDataContext.Provider>
  )
}
