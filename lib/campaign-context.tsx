'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { createClient } from './supabase/client'
import { CampaignStorageService } from './services/campaign-storage.service'
import type { CampaignConfig, LandingPageData, Email } from './types'
import { debounce } from './utils/debounce'
import { logError, getUserFriendlyMessage } from './utils/error-handling'

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
  createNewCampaign: (
    providedLandingPageData?: LandingPageData | null
  ) => Promise<string>
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

  // Create debounced auto-save functions
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
    debounce(async (campaignId: string, config: CampaignConfig) => {
      try {
        await campaignService.updateCampaign(campaignId, {
          tone: config.tone,
          campaignType: config.campaignType,
          days: config.days,
        })
      } catch (error) {
        logError(error, {
          operation: 'auto-save campaign config',
          component: 'CampaignContext',
          campaignId,
          additionalData: {
            tone: config.tone,
            campaignType: config.campaignType,
            days: config.days,
          },
        })
      }
    }, 1000)
  ).current

  // Create a new campaign in the database
  const createNewCampaign = async (
    providedLandingPageData?: LandingPageData | null
  ): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Use provided landing page data or fall back to context state
    const dataToUse = providedLandingPageData || landingPageData

    console.log('Creating campaign with landing page data:', {
      hasProvidedData: !!providedLandingPageData,
      hasContextData: !!landingPageData,
      url: dataToUse?.url,
      hasContent: !!dataToUse?.content,
      hasMetadata: !!dataToUse?.metadata,
    })

    const campaign = await campaignService.createCampaign(user.id, {
      name: 'New Campaign',
      landingPageUrl: dataToUse?.url,
      landingPageContent: dataToUse?.content,
      landingPageMetadata: dataToUse?.metadata,
    })

    setCurrentCampaignId(campaign.id)
    return campaign.id
  }

  // Load a campaign from the database
  const loadCampaign = async (campaignId: string) => {
    setIsLoading(true)
    try {
      console.log('Loading campaign from database:', campaignId)
      const campaign = await campaignService.getCampaign(campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      console.log('Campaign loaded from database:', {
        id: campaign.id,
        hasLandingPageUrl: !!campaign.landing_page_url,
        hasLandingPageContent: !!campaign.landing_page_content,
        hasTone: !!campaign.tone,
        hasCampaignType: !!campaign.campaign_type,
        hasDays: !!campaign.days,
        emailCount: campaign.emails?.length || 0,
      })

      setCurrentCampaignId(campaign.id)

      // Set landing page data
      if (campaign.landing_page_url) {
        setLandingPageDataState({
          url: campaign.landing_page_url,
          content: campaign.landing_page_content || undefined,
          metadata: campaign.landing_page_metadata,
        })
        console.log('Landing page data set')
      } else {
        console.warn('Campaign has no landing page URL')
        // Set minimal landing page data to prevent blank screen
        setLandingPageDataState({
          url: 'https://example.com',
          content: 'Landing page content not available',
          metadata: {
            title: 'Campaign Landing Page',
            description: 'Landing page data not available',
          },
        })
      }

      // Set config
      if (campaign.tone && campaign.campaign_type && campaign.days) {
        setConfigState({
          tone: campaign.tone,
          campaignType: campaign.campaign_type,
          days: campaign.days,
        })
        console.log('Campaign config set')
      } else {
        console.warn('Campaign missing required config fields:', {
          tone: campaign.tone,
          campaignType: campaign.campaign_type,
          days: campaign.days,
        })
        // Set default config to prevent blank screen
        setConfigState({
          tone: campaign.tone || 'professional',
          campaignType: campaign.campaign_type || 'welcome',
          days: campaign.days || 7,
        })
      }

      // Set emails
      if (campaign.emails && campaign.emails.length > 0) {
        setGeneratedEmailsState(campaign.emails)
        console.log('Emails set:', campaign.emails.length)
      } else {
        console.warn('Campaign has no emails')
        // Set a default email to prevent blank screen
        const defaultEmail = {
          id: 1,
          day: 1,
          subject: 'Welcome to our newsletter',
          preview: 'Thank you for subscribing!',
          content:
            "Welcome to our newsletter. We're excited to have you on board!",
        }
        setGeneratedEmailsState([defaultEmail])
        console.log('Default email set')
      }
    } catch (error) {
      console.error('Error loading campaign:', error)
      throw error
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
    // Auto-save if we have a campaign (debounced)
    if (currentCampaignId && data) {
      debouncedSaveLandingPage(currentCampaignId, data)
    }
  }

  const setConfig = (cfg: CampaignConfig | null) => {
    setConfigState(cfg)
    // Auto-save if we have a campaign (debounced)
    if (currentCampaignId && cfg) {
      debouncedSaveConfig(currentCampaignId, cfg)
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
    // Cancel any pending debounced saves
    debouncedSaveLandingPage.cancel()
    debouncedSaveConfig.cancel()

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
