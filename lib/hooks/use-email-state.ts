'use client'

import { useEffect, useCallback } from 'react'
import { useCampaign } from '@/lib/campaign-context'
import { useUrlState } from './use-url-state'
import type { Email } from '@/lib/types'

interface EmailStateReturn {
  emails: Email[]
  selectedEmail: Email | null
  selectedEmailId: number
  selectEmail: (id: number) => void
  updateEmail: (id: number, updates: Partial<Email>) => void
}

export function useEmailState(): EmailStateReturn {
  const { generatedEmails, isLoading, updateEmail: contextUpdateEmail } = useCampaign()
  const { getEmailId, getEmailIdWithFallback, setMultipleParams, isValidEmailId, getCampaignId } =
    useUrlState()

  const emailIdFromUrl = getEmailId()
  const selectedEmailId = getEmailIdWithFallback(1)
  const campaignIdFromUrl = getCampaignId()

  // Use emails directly from context - no local state
  const emails = generatedEmails

  // Only set default email parameter when campaign is fully loaded and has emails
  useEffect(() => {
    // Don't set email parameter if:
    // 1. Campaign is still loading
    // 2. No emails are available yet
    // 3. Email parameter is already set
    // 4. No campaign ID is available (campaign not loaded)
    if (isLoading || emails.length === 0 || emailIdFromUrl || !campaignIdFromUrl) {
      return
    }

    // Only set default email when we have a valid campaign with emails
    const defaultEmailId = 1
    const params: Record<string, string> = {
      email: defaultEmailId.toString(),
    }
    if (campaignIdFromUrl) {
      params.campaign = campaignIdFromUrl
    }
    setMultipleParams(params)
  }, [isLoading, emails.length, emailIdFromUrl, campaignIdFromUrl, setMultipleParams])

  const selectEmail = useCallback(
    (id: number) => {
      // Basic validation before setting
      if (!isValidEmailId(id.toString())) {
        console.warn(`Invalid email ID: ${id}`)
        return
      }

      // Skip URL update if already selected (prevents unnecessary re-renders)
      if (emailIdFromUrl !== null && emailIdFromUrl === id) {
        return
      }

      // Set email ID and preserve campaign ID
      const params: Record<string, string> = { email: id.toString() }
      if (campaignIdFromUrl) {
        params.campaign = campaignIdFromUrl
      }

      setMultipleParams(params)
    },
    [isValidEmailId, campaignIdFromUrl, setMultipleParams, emailIdFromUrl],
  )

  // Wrap in useCallback to prevent unnecessary re-renders in child components
  const updateEmail = useCallback(contextUpdateEmail, [contextUpdateEmail])

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null

  return {
    emails,
    selectedEmail,
    selectedEmailId,
    selectEmail,
    updateEmail,
  }
}
