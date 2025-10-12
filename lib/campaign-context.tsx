'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { CampaignConfig, LandingPageData, Email } from './types'

interface CampaignContextType {
  landingPageData: LandingPageData | null
  setLandingPageData: (data: LandingPageData | null) => void
  config: CampaignConfig | null
  setConfig: (config: CampaignConfig | null) => void
  generatedEmails: Email[]
  setGeneratedEmails: (emails: Email[]) => void
  clearAll: () => void
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
)

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [landingPageData, setLandingPageDataState] =
    useState<LandingPageData | null>(null)
  const [config, setConfigState] = useState<CampaignConfig | null>(null)
  const [generatedEmails, setGeneratedEmailsState] = useState<Email[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('campaign-data')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          setLandingPageDataState(data.landingPageData || null)
          setConfigState(data.config || null)
          setGeneratedEmailsState(data.generatedEmails || [])
        } catch (e) {
          console.error('Failed to parse stored campaign data', e)
        }
      }
    }
  }, [])

  const setLandingPageData = (data: LandingPageData | null) => {
    setLandingPageDataState(data)
    if (typeof window !== 'undefined') {
      const current = JSON.parse(
        sessionStorage.getItem('campaign-data') || '{}'
      )
      sessionStorage.setItem(
        'campaign-data',
        JSON.stringify({ ...current, landingPageData: data })
      )
    }
  }

  const setConfig = (cfg: CampaignConfig | null) => {
    setConfigState(cfg)
    if (typeof window !== 'undefined') {
      const current = JSON.parse(
        sessionStorage.getItem('campaign-data') || '{}'
      )
      sessionStorage.setItem(
        'campaign-data',
        JSON.stringify({ ...current, config: cfg })
      )
    }
  }

  const setGeneratedEmails = (emails: Email[]) => {
    setGeneratedEmailsState(emails)
    if (typeof window !== 'undefined') {
      const current = JSON.parse(
        sessionStorage.getItem('campaign-data') || '{}'
      )
      sessionStorage.setItem(
        'campaign-data',
        JSON.stringify({ ...current, generatedEmails: emails })
      )
    }
  }

  const clearAll = () => {
    setLandingPageDataState(null)
    setConfigState(null)
    setGeneratedEmailsState([])
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('campaign-data')
    }
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
