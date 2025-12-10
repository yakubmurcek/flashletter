'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * IP-based region detection for privacy compliance
 * Uses Vercel's geolocation headers to detect user region
 * Falls back to user choice if needed
 */

export interface LocationInfo {
  country: string | null
  countryCode: string | null
  isEU: boolean
  isUS: boolean
  requiresGDPR: boolean
  requiresCCPA: boolean
  region: 'US' | 'OTHER'
}

interface RegionContextValue {
  locationInfo: LocationInfo | null
  isLoading: boolean
  updateRegion: (region: 'US' | 'OTHER') => void
}

/**
 * Detect user region using IP geolocation via API
 * Privacy-friendly - uses Vercel's built-in geolocation
 */
export async function detectRegionFromIP(): Promise<LocationInfo> {
  try {
    const response = await fetch('/api/detect-region', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('IP-based region detection result:', data)
      return data
    } else {
      console.log('IP detection failed, falling back to US')
      return createLocationInfo('US')
    }
  } catch (error) {
    console.log('IP detection error, falling back to US:', error)
    return createLocationInfo('US')
  }
}

/**
 * Create location info object from country code
 */
function createLocationInfo(countryCode: string | null): LocationInfo {
  // EU countries that require GDPR compliance
  const EU_COUNTRIES = [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    'IS',
    'LI',
    'NO',
    'CH',
  ]

  // US states/countries that use CCPA-style privacy laws
  const CCPA_COUNTRIES = ['US']

  const isEU = countryCode ? EU_COUNTRIES.includes(countryCode) : false
  const isUS = countryCode ? CCPA_COUNTRIES.includes(countryCode) : false

  return {
    country: countryCode,
    countryCode,
    isEU,
    isUS,
    requiresGDPR: !isUS, // Everything except US gets GDPR (includes EU)
    requiresCCPA: isUS,
    region: isUS ? 'US' : 'OTHER',
  }
}

/**
 * Save user's chosen region to localStorage
 */
export function saveUserRegion(region: 'US' | 'OTHER'): void {
  try {
    localStorage.setItem('user-privacy-region', region)
  } catch (error) {
    console.log('Could not save region to localStorage:', error)
  }
}

/**
 * React context to share region detection state across components.
 */
const RegionContext = createContext<RegionContextValue | undefined>(undefined)

export function RegionProvider({ children }: { children: ReactNode }) {
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const detectRegion = async () => {
      // Check if user has manually overridden the region
      try {
        const savedRegion = localStorage.getItem('user-privacy-region')
        console.log('Saved region from localStorage:', savedRegion)
        if (savedRegion && ['US', 'OTHER'].includes(savedRegion)) {
          console.log('Using saved region:', savedRegion)
          if (isMounted) {
            setLocationInfo(createLocationInfo(savedRegion))
            setIsLoading(false)
          }
          return
        }
      } catch (error) {
        console.log('Could not access localStorage:', error)
      }

      // Auto-detect from IP
      console.log('Auto-detecting region from IP...')
      const region = await detectRegionFromIP()
      console.log('Final region result:', region)
      if (isMounted) {
        setLocationInfo(region)
        setIsLoading(false)
      }
    }

    detectRegion()

    return () => {
      isMounted = false
    }
  }, [])

  const updateRegion = useCallback((region: 'US' | 'OTHER') => {
    saveUserRegion(region)
    setLocationInfo(createLocationInfo(region))
    setIsLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      locationInfo,
      isLoading,
      updateRegion,
    }),
    [locationInfo, isLoading, updateRegion],
  )

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

/**
 * Hook for React components to access region detection state.
 * Must be used within a RegionProvider.
 */
export function useRegionDetection(): RegionContextValue {
  const context = useContext(RegionContext)
  if (!context) {
    throw new Error('useRegionDetection must be used within a RegionProvider')
  }
  return context
}
