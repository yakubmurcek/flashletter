import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

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

export interface RegionInfo {
  country: string | null
  countryCode: string | null
  isEU: boolean
  isUS: boolean
  requiresGDPR: boolean
  requiresCCPA: boolean
  region: 'US' | 'OTHER'
}

function createRegionInfo(countryCode: string | null): RegionInfo {
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

export async function GET(request: NextRequest) {
  try {
    // Get country code from Vercel's geolocation headers
    const countryCode = request.headers.get('x-vercel-ip-country')

    // For local development, default to US (simpler experience)
    if (!countryCode || countryCode === 'XX') {
      Sentry.addBreadcrumb({
        category: 'region-detection',
        message: 'No country code detected, defaulting to US for development',
        level: 'info',
      })
      return NextResponse.json(createRegionInfo('US'))
    }

    const regionInfo = createRegionInfo(countryCode)

    Sentry.addBreadcrumb({
      category: 'region-detection',
      message: `Detected country: ${countryCode}, Region: ${regionInfo.region}`,
      level: 'info',
    })

    return NextResponse.json(regionInfo)
  } catch (error) {
    // Report to Sentry
    Sentry.captureException(error, {
      level: 'warning',
      tags: { api_route: '/api/detect-region' },
    })

    // Fallback to US on error (simpler experience)
    return NextResponse.json(createRegionInfo('US'))
  }
}
