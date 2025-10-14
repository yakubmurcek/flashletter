'use client'

import { createContext, useContext } from 'react'
import type { CampaignConfig, LandingPageData, Email } from '../types'

export interface CampaignDataContextType {
  currentCampaignId: string | null
  landingPageData: LandingPageData | null
  config: CampaignConfig | null
  generatedEmails: Email[]
  isLoading: boolean
}

export interface CampaignActionsContextType {
  setLandingPageData: (data: LandingPageData | null) => void
  setConfig: (config: CampaignConfig | null) => void
  setGeneratedEmails: (emails: Email[]) => Promise<void>
  updateEmail: (id: number, updates: Partial<Email>) => void
  loadCampaign: (campaignId: string) => Promise<void>
  saveCampaign: () => Promise<void>
  createNewCampaign: (
    providedLandingPageData?: LandingPageData | null
  ) => Promise<string>
  updateCampaignConfig: (config: CampaignConfig) => Promise<void>
  clearAll: () => void
}

export const CampaignDataContext = createContext<
  CampaignDataContextType | undefined
>(undefined)

export const CampaignActionsContext = createContext<
  CampaignActionsContextType | undefined
>(undefined)

export function useCampaignData() {
  const context = useContext(CampaignDataContext)
  if (context === undefined) {
    throw new Error('useCampaignData must be used within a CampaignProvider')
  }
  return context
}

export function useCampaignActions() {
  const context = useContext(CampaignActionsContext)
  if (context === undefined) {
    throw new Error('useCampaignActions must be used within a CampaignProvider')
  }
  return context
}

export function useCampaign() {
  const data = useCampaignData()
  const actions = useCampaignActions()
  return { ...data, ...actions }
}
