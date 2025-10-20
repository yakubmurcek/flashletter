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

// Countries that should use GDPR-style privacy (EU + others for safety)
const GDPR_COUNTRIES = [...EU_COUNTRIES]

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
      console.log('No country code detected, defaulting to US for development')
      return NextResponse.json(createRegionInfo('US'))
    }

    const regionInfo = createRegionInfo(countryCode)

    console.log(
      `Detected country: ${countryCode}, Region: ${regionInfo.region}`
    )

    return NextResponse.json(regionInfo)
  } catch (error) {
    console.error('Region detection error:', error)

    // Fallback to US on error (simpler experience)
    return NextResponse.json(createRegionInfo('US'))
  }
}
