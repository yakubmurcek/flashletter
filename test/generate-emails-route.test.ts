import { describe, it, expect, vi, beforeEach } from 'vitest'
import { must } from './_helpers/must'
import Anthropic from '@anthropic-ai/sdk'

const captureExceptionMock = vi.fn()
vi.mock('@/lib/billing/limits', () => ({
  getPlan: async () => 'free',
  consumeAiRewrite: async () => null,
  checkEmailCount: () => null,
  checkCampaignAllowed: async () => null,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}))

const generateStructuredMock = vi.fn()
vi.mock('@/lib/ai', async () => {
  const { default: SDK } = await import('@anthropic-ai/sdk')
  return {
    generateStructured: (...args: unknown[]) => generateStructuredMock(...args),
    isRateLimitError: (error: unknown) => error instanceof SDK.RateLimitError,
    extractRateLimitInfo: () => ({ limit: 50, remaining: 0, resetTime: '2026-10-07T12:00:00Z' }),
  }
})

const checkRateLimitMock = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitHeaders: () => ({
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': '9',
    'X-RateLimit-Reset': '0',
  }),
  generateEmailsRateLimit: null,
  generateEmailsIpRateLimit: 'generate-ip-limiter',
  checkUserAndIpRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}))

vi.mock('@/lib/utils/get-client-ip', () => ({
  getClientIp: () => '127.0.0.1',
}))

const saveEmailsMock = vi.fn()
const isOwnedByMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  // Use a class wrapper so vi.restoreAllMocks() can't strip the
  // implementation between tests.
  CampaignStorageService: class {
    saveEmails = (...args: unknown[]) => saveEmailsMock(...args)
    isOwnedBy = (...args: unknown[]) => isOwnedByMock(...args)
  },
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
import { aiEmailsResponseSchema } from '@/lib'

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

interface GenerateCall {
  system: string
  messages: Array<{ role: string; content: string }>
  schema: unknown
  effort?: string
  maxTokens?: number
}

function lastCall(): GenerateCall {
  return must(generateStructuredMock.mock.calls.at(-1))[0] as GenerateCall
}

function rateLimitError() {
  return new Anthropic.RateLimitError(
    429,
    { type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit exceeded' } },
    'Rate limit exceeded',
    new Headers(),
  )
}

const VALID_CAMPAIGN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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
  // campaignConfigSchema requires tone (max 64), campaignType (max 64), days
  config: {
    tone: 'professional',
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
    captureExceptionMock.mockReset()
    generateStructuredMock.mockReset().mockResolvedValue({
      emails: [
        {
          day: 1,
          subject: 'Subject 1',
          preview: 'Preview 1',
          content: 'Content 1',
        },
        {
          day: 2,
          subject: 'Subject 2',
          preview: 'Preview 2',
          content: 'Content 2',
        },
        {
          day: 3,
          subject: 'Subject 3',
          preview: 'Preview 3',
          content: 'Content 3',
        },
      ],
    })
    saveEmailsMock.mockReset().mockResolvedValue([
      {
        id: 1,
        uuid: 'uuid-1',
        day: 1,
        subject: 'Subject 1',
        preview: 'Preview 1',
        content: 'Content 1',
      },
      {
        id: 2,
        uuid: 'uuid-2',
        day: 2,
        subject: 'Subject 2',
        preview: 'Preview 2',
        content: 'Content 2',
      },
      {
        id: 3,
        uuid: 'uuid-3',
        day: 3,
        subject: 'Subject 3',
        preview: 'Preview 3',
        content: 'Content 3',
      },
    ])
    // Audit-fix: routes call CampaignStorageService.isOwnedBy() before
    // saving. Default to true so happy-path tests don't 403.
    isOwnedByMock.mockReset().mockResolvedValue(true)
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

  it('applies the per-IP limit on top of the per-user one', async () => {
    await POST(buildRequest(validRequestBody) as never)
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      null,
      'generate-ip-limiter',
      'user-123',
      '127.0.0.1',
    )
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
    expect(body.emails[0]).toMatchObject({ id: 1, uuid: null, subject: 'Subject 1' })
    expect(saveEmailsMock).not.toHaveBeenCalled()
  })

  it('asks the AI for the campaign with the email schema', async () => {
    await POST(buildRequest(validRequestBody) as never)

    expect(generateStructuredMock).toHaveBeenCalledOnce()
    const call = lastCall()
    expect(call.system).toBe('Build instructions')
    expect(call.schema).toBe(aiEmailsResponseSchema)
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0].role).toBe('user')
    expect(call.messages[0].content).toContain('3 emails')
    expect(call.messages[0].content).toContain('nurture')
  })

  it('happy path: generates and saves emails with campaignId', async () => {
    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never,
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.emails).toBeDefined()
    expect(body.emails.length).toBe(3)
    expect(saveEmailsMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, expect.any(Array))
  })

  it('returns unsaved emails when save fails', async () => {
    saveEmailsMock.mockRejectedValue(new Error('Database error'))

    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never,
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.emails).toBeDefined()
    expect(body.warning).toContain('Could not save emails')
  })

  it('handles an AI rate limit error', async () => {
    const error = rateLimitError()
    generateStructuredMock.mockRejectedValue(error)

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toBe('AI rate limit exceeded')
    expect(body.rateLimitInfo).toEqual({
      limit: 50,
      remaining: 0,
      resetTime: '2026-10-07T12:00:00Z',
    })
    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'warning',
        tags: { error_type: 'ai_rate_limit', api_route: '/api/generate-emails' },
      }),
    )
  })

  it('handles a general AI error', async () => {
    generateStructuredMock.mockRejectedValue(new Error('AI returned an unexpected format'))

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to generate emails')
    expect(saveEmailsMock).not.toHaveBeenCalled()
  })

  it('caps emails to config.days', async () => {
    generateStructuredMock.mockResolvedValue({
      emails: [
        { day: 1, subject: 'S1', preview: 'P1', content: 'C1' },
        { day: 1, subject: 'S2', preview: 'P2', content: 'C2' },
        { day: 1, subject: 'S3', preview: 'P3', content: 'C3' },
        { day: 4, subject: 'S4', preview: 'P4', content: 'C4' },
        { day: 5, subject: 'S5', preview: 'P5', content: 'C5' },
      ],
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 3 },
      }) as never,
    )
    const body = await response.json()
    expect(body.emails.length).toBe(3)
    // Day numbers come from the position, never from the model.
    expect(body.emails.map((e: { day: number }) => e.day)).toEqual([1, 2, 3])
    expect(body.emails[2].subject).toBe('S3')
  })

  it('includes rate limit headers in response', async () => {
    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('makes every link in the generated emails absolute before saving', async () => {
    generateStructuredMock.mockResolvedValue({
      emails: [
        { subject: 'S1', preview: 'P1', content: '[Sign up](/register)' },
        { subject: 'S2', preview: 'P2', content: '[Docs](//docs.example.com/a)' },
        { subject: 'S3', preview: 'P3', content: '[Mail](mailto:a@example.com)' },
      ],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    const body = await response.json()
    expect(body.emails.map((e: { content: string }) => e.content)).toEqual([
      '[Sign up](https://example.com/register)',
      '[Docs](https://docs.example.com/a)',
      '[Mail](mailto:a@example.com)',
    ])

    await POST(buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never)
    expect(saveEmailsMock.mock.calls[0][1][0].content).toBe(
      '[Sign up](https://example.com/register)',
    )
  })
})
