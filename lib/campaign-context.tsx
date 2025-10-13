'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { createClient } from './supabase/client'
import { CampaignStorageService } from './services/campaign-storage.service'
import type { CampaignConfig, LandingPageData, Email } from './types'

interface CampaignContextType {
  currentCampaignId: string | null
  landingPageData: LandingPageData | null
  setLandingPageData: (data: LandingPageData | null) => void
  config: CampaignConfig | null
  setConfig: (config: CampaignConfig | null) => void
  generatedEmails: Email[]
  setGeneratedEmails: (emails: Email[]) => Promise<void>
  loadCampaign: (campaignId: string) => Promise<void>
  saveCampaign: () => Promise<void>
  createNewCampaign: () => Promise<string>
  updateCampaignConfig: (config: CampaignConfig) => Promise<void>
  clearAll: () => void
  isLoading: boolean
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(
    null
  )
  const [landingPageData, setLandingPageDataState] =
    useState<LandingPageData | null>(null)
  const [config, setConfigState] = useState<CampaignConfig | null>(null)
  const [generatedEmails, setGeneratedEmailsState] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()
  const campaignService = new CampaignStorageService(supabase)

  // Create a new campaign in the database
  const createNewCampaign = async (): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const campaign = await campaignService.createCampaign(user.id, {
      name: 'New Campaign',
      landingPageUrl: landingPageData?.url,
      landingPageContent: landingPageData?.content,
      landingPageMetadata: landingPageData?.metadata,
    })

    setCurrentCampaignId(campaign.id)
    return campaign.id
  }

  // Load a campaign from the database
  const loadCampaign = async (campaignId: string) => {
    setIsLoading(true)
    try {
      const campaign = await campaignService.getCampaign(campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      setCurrentCampaignId(campaign.id)

      // Set landing page data
      if (campaign.landing_page_url) {
        setLandingPageDataState({
          url: campaign.landing_page_url,
          content: campaign.landing_page_content || undefined,
          metadata: campaign.landing_page_metadata,
        })
      }

      // Set config
      if (campaign.tone && campaign.campaign_type && campaign.days) {
        setConfigState({
          tone: campaign.tone,
          campaignType: campaign.campaign_type,
          days: campaign.days,
        })
      }

      // Set emails
      if (campaign.emails && campaign.emails.length > 0) {
        setGeneratedEmailsState(campaign.emails)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Save current campaign state to database
  const saveCampaign = async () => {
    if (!currentCampaignId) return

    await campaignService.updateCampaign(currentCampaignId, {
      landingPageUrl: landingPageData?.url,
      landingPageContent: landingPageData?.content,
      landingPageMetadata: landingPageData?.metadata,
      tone: config?.tone,
      campaignType: config?.campaignType,
      days: config?.days,
    })

    // Save emails if they exist
    if (generatedEmails.length > 0) {
      const savedEmails = await campaignService.saveEmails(
        currentCampaignId,
        generatedEmails
      )
      // Update the emails with UUIDs from database
      setGeneratedEmailsState(savedEmails)
    }
  }

  // Update campaign configuration
  const updateCampaignConfig = async (newConfig: CampaignConfig) => {
    setConfigState(newConfig)

    if (currentCampaignId) {
      await campaignService.updateCampaign(currentCampaignId, {
        tone: newConfig.tone,
        campaignType: newConfig.campaignType,
        days: newConfig.days,
      })
    }
  }

  const setLandingPageData = (data: LandingPageData | null) => {
    setLandingPageDataState(data)
    // Auto-save if we have a campaign
    if (currentCampaignId && data) {
      campaignService.updateCampaign(currentCampaignId, {
        landingPageUrl: data.url,
        landingPageContent: data.content,
        landingPageMetadata: data.metadata,
      })
    }
  }

  const setConfig = (cfg: CampaignConfig | null) => {
    setConfigState(cfg)
    // Auto-save if we have a campaign
    if (currentCampaignId && cfg) {
      campaignService.updateCampaign(currentCampaignId, {
        tone: cfg.tone,
        campaignType: cfg.campaignType,
        days: cfg.days,
      })
    }
  }

  const setGeneratedEmails = async (emails: Email[]) => {
    setGeneratedEmailsState(emails)
    // Auto-save if we have a campaign
    if (currentCampaignId && emails.length > 0) {
      const savedEmails = await campaignService.saveEmails(
        currentCampaignId,
        emails
      )
      // Update with emails that have UUIDs from database
      setGeneratedEmailsState(savedEmails)
    }
  }

  const clearAll = () => {
    setCurrentCampaignId(null)
    setLandingPageDataState(null)
    setConfigState(null)
    setGeneratedEmailsState([])
  }

  return (
    <CampaignContext.Provider
      value={{
        currentCampaignId,
        landingPageData,
        setLandingPageData,
        config,
        setConfig,
        generatedEmails,
        setGeneratedEmails,
        loadCampaign,
        saveCampaign,
        createNewCampaign,
        updateCampaignConfig,
        clearAll,
        isLoading,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const context = useContext(CampaignContext)
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider')
  }
  return context
}
