import type { LandingPageData, CampaignConfig, Email } from '../types'

const STORAGE_KEY = 'campaign-data'

export interface StorageData {
  landingPageData?: LandingPageData
  config?: CampaignConfig
  generatedEmails?: Email[]
}

export const storage = {
  get(): StorageData {
    if (typeof window === 'undefined') return {}

    try {
      const data = sessionStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Failed to parse stored campaign data', error)
      return {}
    }
  },

  set(data: Partial<StorageData>): void {
    if (typeof window === 'undefined') return

    const current = this.get()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }))
  },

  clear(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(STORAGE_KEY)
  },
}
