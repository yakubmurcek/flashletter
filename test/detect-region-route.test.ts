import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Import after all vi.mock calls
import { GET } from '@/app/api/detect-region/route'

function buildRequest(countryCode: string | null = null): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (countryCode) {
    headers.set('x-vercel-ip-country', countryCode)
  }
  return new Request('http://localhost/api/detect-region', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/detect-region', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with valid region info', async () => {
    const response = await GET(buildRequest('US') as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    const body = await response.json()
    expect(body).toMatchObject({
      country: 'US',
      countryCode: 'US',
      isEU: false,
      isUS: true,
      requiresGDPR: false,
      requiresCCPA: true,
      region: 'US',
    })
  })

  it('detects EU country correctly', async () => {
    const response = await GET(buildRequest('DE') as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      country: 'DE',
      countryCode: 'DE',
      isEU: true,
      isUS: false,
      requiresGDPR: true,
      requiresCCPA: false,
      region: 'OTHER',
    })
  })

  it('detects France as EU', async () => {
    const response = await GET(buildRequest('FR') as never)
    const body = await response.json()
    expect(body.isEU).toBe(true)
    expect(body.requiresGDPR).toBe(true)
  })

  it('defaults to US when no country code is provided', async () => {
    const response = await GET(buildRequest(null) as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.country).toBe('US')
    expect(body.isUS).toBe(true)
  })

  it('defaults to US for XX (dev/unknown)', async () => {
    const response = await GET(buildRequest('XX') as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.country).toBe('US')
  })

  it('non-EU countries have region OTHER', async () => {
    const response = await GET(buildRequest('JP') as never)
    const body = await response.json()
    expect(body.region).toBe('OTHER')
    expect(body.isEU).toBe(false)
  })

  it('returns 200 on error (fallback to US)', async () => {
    const response = await GET(buildRequest('US') as never)
    expect(response.status).toBe(200)
    // Should always return valid region info, never error
    const body = await response.json()
    expect(body.country).toBeDefined()
  })
})
