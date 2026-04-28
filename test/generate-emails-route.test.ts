import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const openaiResponsesParseMock = vi.fn()
vi.mock('@/lib/openai', () => ({
  openai: {
    responses: {
      parse: (...args: unknown[]) => openaiResponsesParseMock(...args),
    },
  },
}))

const retryWithBackoffMock = vi.fn()
vi.mock('@/lib/utils/openai-retry', () => ({
  retryWithBackoff: (...args: unknown[]) => retryWithBackoffMock(...args),
  extractRateLimitInfo: (error: unknown) => ({ remaining: 0, reset: 100 }),
}))

const checkRateLimitMock = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitHeaders: () => ({
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': '0',
  }),
  generateEmailsRateLimit: null,
}))

vi.mock('@/lib/utils/get-client-ip', () => ({
  getClientIp: () => '127.0.0.1',
}))

const saveEmailsMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  CampaignStorageService: vi.fn().mockImplementation(() => ({
    saveEmails: (...args: unknown[]) => saveEmailsMock(...args),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

vi.mock('@/app/api/generate-emails/prompts', () => ({
  buildInstructions: () => 'Build instructions',
}))

// Import after all vi.mock calls
import { POST } from '@/app/api/generate-emails/route'

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validRequestBody = {
  landingUrl: 'https://example.com',
  landingContent: 'Example content',
  landingAnalysis: {
    valueProp: 'value proposition',
    targetAudience: 'audience',
    primaryCTA: 'CTA text',
    toneFingerprint: 'professional',
    objections: [],
    proofPoints: [],
    angles: ['angle1'],
    opportunities: [],
  },
  config: {
    days: 3,
    campaignType: 'nurture',
  },
}

describe('POST /api/generate-emails', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    checkRateLimitMock.mockReset().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
    })
    retryWithBackoffMock.mockReset().mockResolvedValue({
      output_parsed: {
        emails: [
          {
            subject: 'Subject 1',
            preview: 'Preview 1',
            content: 'Content 1',
          },
          {
            subject: 'Subject 2',
            preview: 'Preview 2',
            content: 'Content 2',
          },
          {
            subject: 'Subject 3',
            preview: 'Preview 3',
            content: 'Content 3',
          },
        ],
      },
      usage: { prompt_tokens: 100, completion_tokens: 200 },
    })
    saveEmailsMock.mockReset().mockResolvedValue([
      { id: 1, uuid: 'uuid-1', day: 1, subject: 'Subject 1', preview: 'Preview 1', content: 'Content 1' },
      { id: 2, uuid: 'uuid-2', day: 2, subject: 'Subject 2', preview: 'Preview 2', content: 'Content 2' },
      { id: 3, uuid: 'uuid-3', day: 3, subject: 'Subject 3', preview: 'Preview 3', content: 'Content 3' },
    ])
  })

  it('returns 400 for invalid request format', async () => {
    const response = await POST(buildRequest({ invalid: 'data' }) as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await POST(buildRequest({ landingUrl: 'https://example.com' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limit exceeded', async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 100,
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('Too many requests')
  })

  it('happy path: generates and returns emails without campaignId', async () => {
    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const body = await response.json()
    expect(body.emails).toBeDefined()
    expect(Array.isArray(body.emails)).toBe(true)
    expect(body.emails.length).toBe(3)
    expect(body.emails[0].day).toBe(1)
    expect(body.emails[1].day).toBe(2)
    expect(body.emails[2].day).toBe(3)
    expect(body.usage).toBeDefined()
  })

  it('happy path: generates and saves emails with campaignId', async () => {
    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: 'campaign-123' }) as never,
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.emails).toBeDefined()
    expect(body.emails.length).toBe(3)
    expect(saveEmailsMock).toHaveBeenCalledWith('campaign-123', expect.any(Array))
  })

  it('returns unsaved emails when save fails', async () => {
    saveEmailsMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: 'campaign-123' }) as never,
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.emails).toBeDefined()
    expect(body.warning).toContain('Could not save emails')
  })

  it('handles OpenAI 429 rate limit error', async () => {
    const error = { status: 429, message: 'Rate limit exceeded' }
    retryWithBackoffMock.mockRejectedValue(error)

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('OpenAI rate limit')
  })

  it('handles general OpenAI error', async () => {
    const error = new Error('OpenAI connection failed')
    retryWithBackoffMock.mockRejectedValue(error)

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('caps emails to config.days', async () => {
    retryWithBackoffMock.mockResolvedValue({
      output_parsed: {
        emails: [
          { subject: 'S1', preview: 'P1', content: 'C1' },
          { subject: 'S2', preview: 'P2', content: 'C2' },
          { subject: 'S3', preview: 'P3', content: 'C3' },
          { subject: 'S4', preview: 'P4', content: 'C4' },
          { subject: 'S5', preview: 'P5', content: 'C5' },
        ],
      },
      usage: { prompt_tokens: 100, completion_tokens: 200 },
    })

    const response = await POST(
      buildRequest({ ...validRequestBody, config: { ...validRequestBody.config, days: 3 } }) as never,
    )
    const body = await response.json()
    expect(body.emails.length).toBe(3)
    expect(body.emails[0].day).toBe(1)
    expect(body.emails[2].day).toBe(3)
  })

  it('includes rate limit headers in response', async () => {
    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })
})
