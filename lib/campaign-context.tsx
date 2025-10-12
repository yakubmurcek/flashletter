'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { storage } from './utils/storage'
import type { CampaignConfig, LandingPageData, Email } from './types'

interface CampaignContextType {
  landingPageData: LandingPageData | null
  setLandingPageData: (data: LandingPageData | null) => void
  config: CampaignConfig | null
  setConfig: (config: CampaignConfig | null) => void
  generatedEmails: Email[]
  setGeneratedEmails: (emails: Email[]) => void
  clearAll: () => void
  isLoading: boolean
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [landingPageData, setLandingPageDataState] =
    useState<LandingPageData | null>(null)
  const [config, setConfigState] = useState<CampaignConfig | null>(null)
  const [generatedEmails, setGeneratedEmailsState] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = storage.get()
    if (stored.landingPageData) setLandingPageDataState(stored.landingPageData)
    if (stored.config) setConfigState(stored.config)
    if (stored.generatedEmails) setGeneratedEmailsState(stored.generatedEmails)
    setIsLoading(false)
  }, [])

  const setLandingPageData = (data: LandingPageData | null) => {
    setLandingPageDataState(data)
    storage.set({ landingPageData: data })
  }

  const setConfig = (cfg: CampaignConfig | null) => {
    setConfigState(cfg)
    storage.set({ config: cfg })
  }

  const setGeneratedEmails = (emails: Email[]) => {
    setGeneratedEmailsState(emails)
    storage.set({ generatedEmails: emails })
  }

  const clearAll = () => {
    setLandingPageDataState(null)
    setConfigState(null)
    setGeneratedEmailsState([])
    storage.clear()
  }

  return (
    <CampaignContext.Provider
      value={{
        landingPageData,
        setLandingPageData,
        config,
        setConfig,
        generatedEmails,
        setGeneratedEmails,
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
