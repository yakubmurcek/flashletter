'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

// Simple validation helpers
const isValidCampaignId = (id: string): boolean => {
  return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9-_]+$/.test(id)
}

const isValidEmailId = (id: string): boolean => {
  const num = parseInt(id, 10)
  return !isNaN(num) && num > 0 && num <= 100 // Reasonable email count limit
}

export function useUrlState() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams]
  )

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const deleteParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(key)
      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  const toggleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (params.has(key)) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  // Campaign ID getter with basic validation
  const getCampaignId = useCallback((): string | null => {
    const id = getParam('campaign')
    return id && isValidCampaignId(id) ? id : null
  }, [getParam])

  // Email ID getter with basic validation
  const getEmailId = useCallback((): number | null => {
    const id = getParam('email')
    if (!id || !isValidEmailId(id)) return null
    return parseInt(id, 10)
  }, [getParam])

  // Email ID with fallback
  const getEmailIdWithFallback = useCallback(
    (fallbackId: number = 1): number => {
      const currentEmailId = getEmailId()
      return currentEmailId || fallbackId
    },
    [getEmailId]
  )

  // Set multiple params with optional validation
  const setMultipleParams = useCallback(
    (params: Record<string, string>, validate = true) => {
      const urlParams = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(params)) {
        // Basic validation for known params
        if (validate) {
          if (key === 'campaign' && !isValidCampaignId(value)) {
            console.warn(`Invalid campaign ID: ${value}`)
            continue
          }
          if (key === 'email' && !isValidEmailId(value)) {
            console.warn(`Invalid email ID: ${value}`)
            continue
          }
        }
        urlParams.set(key, value)
      }

      router.push(`?${urlParams.toString()}`)
    },
    [router, searchParams]
  )

  // Simple cleanup - remove all params except specified ones
  const cleanupParams = useCallback(
    (keysToKeep: string[] = []) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key] of params.entries()) {
        if (!keysToKeep.includes(key)) {
          params.delete(key)
        }
      }

      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  return {
    getParam,
    setParam,
    deleteParam,
    toggleParam,
    getCampaignId,
    getEmailId,
    getEmailIdWithFallback,
    setMultipleParams,
    cleanupParams,
    // Export validators for external use
    isValidCampaignId,
    isValidEmailId,
  }
}
