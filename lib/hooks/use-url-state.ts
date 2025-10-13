import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { isValidCampaignId, isValidEmailId } from '@/lib/utils/validation'

export function useUrlState() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams]
  )

  // Enhanced methods with validation and cleanup
  const setParamWithValidation = useCallback(
    (key: string, value: string, validator?: (val: string) => boolean) => {
      if (validator && !validator(value)) {
        console.warn(`Invalid value for ${key}: ${value}`)
        return false
      }
      setParam(key, value)
      return true
    },
    [setParam]
  )

  const setMultipleParams = useCallback(
    (
      params: Record<string, string>,
      validators?: Record<string, (val: string) => boolean>,
      keysToKeep?: string[]
    ) => {
      const urlParams = new URLSearchParams(searchParams.toString())

      // If keysToKeep is provided, clean up all params except those being set and those to keep
      if (keysToKeep) {
        const allKeysToKeep = [
          ...new Set([...Object.keys(params), ...keysToKeep]),
        ]
        const keysToDelete: string[] = []

        for (const [key] of urlParams.entries()) {
          if (!allKeysToKeep.includes(key)) {
            keysToDelete.push(key)
          }
        }

        keysToDelete.forEach((key) => urlParams.delete(key))
      }

      // Set the new params
      for (const [key, value] of Object.entries(params)) {
        const validator = validators?.[key]
        if (validator && !validator(value)) {
          console.warn(`Invalid value for ${key}: ${value}`)
          continue
        }
        urlParams.set(key, value)
      }

      router.push(`?${urlParams.toString()}`)
    },
    [router, searchParams]
  )

  const cleanupParams = useCallback(
    (keysToKeep: string[] = []) => {
      const params = new URLSearchParams(searchParams.toString())
      const keysToDelete: string[] = []

      for (const [key] of params.entries()) {
        if (!keysToKeep.includes(key)) {
          keysToDelete.push(key)
        }
      }

      keysToDelete.forEach((key) => params.delete(key))
      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  // Specialized getters with validation
  const getCampaignId = useCallback((): string | null => {
    const id = getParam('campaign')
    return id && isValidCampaignId(id) ? id : null
  }, [getParam])

  const getEmailId = useCallback((): number | null => {
    const id = getParam('email')
    if (!id || !isValidEmailId(id)) return null
    return parseInt(id, 10)
  }, [getParam])

  // Non-side-effect version for just getting the current email ID with fallback
  const getEmailIdWithFallback = useCallback(
    (fallbackId: number = 1): number => {
      const currentEmailId = getEmailId()
      return currentEmailId || fallbackId
    },
    [getEmailId]
  )

  return {
    setParam,
    deleteParam,
    toggleParam,
    getParam,
    setParamWithValidation,
    setMultipleParams,
    cleanupParams,
    getCampaignId,
    getEmailId,
    getEmailIdWithFallback,
    // Export validators for external use
    isValidCampaignId,
    isValidEmailId,
  }
}
