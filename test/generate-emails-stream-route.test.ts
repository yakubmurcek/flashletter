import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  buildFirstEmailInstructions: () => 'First email instructions',
  buildRemainingEmailsInstructions: () => 'Remaining emails instructions',
}))

// Import after all vi.mock calls
import { POST } from '@/app/api/generate-emails/stream/route'
import { aiEmailsResponseSchema } from '@/lib'

interface StreamEvent {
  type: 'start' | 'email' | 'complete' | 'error'
  total?: number
  email?: { day: number; subject: string }
  emails?: Array<{ day: number; subject: string }>
  warning?: string
  message?: string
}
async function readStreamEvents(response: Response): Promise<StreamEvent[]> {
  if (!response.body) return []
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: StreamEvent[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (line) events.push(JSON.parse(line))
    }
  }
  return events
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate-emails/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
    days: 2,
    campaignType: 'nurture',
  },
}

describe('POST /api/generate-emails/stream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    checkRateLimitMock.mockReset().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
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
    ])
    // Audit-fix: routes call CampaignStorageService.isOwnedBy() before
    // saving. Default to true so happy-path tests don't 403.
    isOwnedByMock.mockReset().mockResolvedValue(true)
    captureExceptionMock.mockReset()
    generateStructuredMock.mockReset()
  })

  it('returns 400 for invalid body', async () => {
    const response = await POST(buildRequest({ url: 'not-a-url' }) as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 429 when rate limit exceeded (not a stream)', async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 100,
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(429)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('happy path returns NDJSON stream with start event', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')

    const events = await readStreamEvents(response)
    expect(events.length).toBeGreaterThan(0)

    const startEvent = events.find((e) => e.type === 'start')
    expect(startEvent).toBeDefined()
    expect(startEvent?.total).toBe(2)
  })

  it('emits email events in correct order', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)
    const emailEvents = events.filter((e) => e.type === 'email')

    expect(emailEvents.length).toBe(2)
    expect(emailEvents[0]?.email?.day).toBe(1)
    expect(emailEvents[1]?.email?.day).toBe(2)
  })

  it('includes complete event with emails at end', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(completeEvent).toBeDefined()
    expect(completeEvent?.type).toBe('complete')
    expect(completeEvent?.emails).toBeDefined()
    expect(Array.isArray(completeEvent?.emails)).toBe(true)
  })

  it('sets correct streaming headers', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('Cache-Control')).toContain('no-cache')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('emits an error event with the message when the AI call fails', async () => {
    generateStructuredMock.mockRejectedValue(new Error('AI returned an unexpected format'))

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')

    const events = await readStreamEvents(response)
    const errorEvent = events.find((e) => e.type === 'error')

    expect(errorEvent?.message).toBe('AI returned an unexpected format')
    expect(events.some((e) => e.type === 'complete')).toBe(false)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('emits a friendly error event on an AI rate limit and reports it', async () => {
    const error = new Anthropic.RateLimitError(
      429,
      { type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit exceeded' } },
      'Rate limit exceeded',
      new Headers(),
    )
    generateStructuredMock.mockRejectedValue(error)

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)
    const errorEvent = events.find((e) => e.type === 'error')

    expect(errorEvent?.message).toBe('Too many requests to AI service. Please try again later.')
    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'warning',
        tags: { error_type: 'ai_rate_limit', api_route: '/api/generate-emails/stream' },
        extra: {
          rateLimitInfo: { limit: 50, remaining: 0, resetTime: '2026-10-07T12:00:00Z' },
        },
      }),
    )
  })

  it('emits Day 1 before failing when phase 2 fails', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockRejectedValueOnce(new Error('AI response was cut off before it finished'))

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)

    expect(events.map((e) => e.type)).toEqual(['start', 'email', 'error'])
    expect(events[1].email?.day).toBe(1)
    expect(events[2].message).toBe('AI response was cut off before it finished')
  })

  it('generates Day 1 first, then the remaining days, with the email schema', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({ emails: [{ day: 2, subject: 'S2', preview: 'P2', content: 'C2' }] })

    await readStreamEvents(await POST(buildRequest(validRequestBody) as never))

    expect(generateStructuredMock).toHaveBeenCalledTimes(2)
    const [first, second] = generateStructuredMock.mock.calls.map(
      (call) =>
        call[0] as {
          system: string
          messages: Array<{ role: string; content: string }>
          schema: unknown
        },
    )
    expect(first.system).toBe('First email instructions')
    expect(first.schema).toBe(aiEmailsResponseSchema)
    expect(first.messages).toEqual([{ role: 'user', content: 'Generate Day 1 only.' }])
    expect(second.system).toBe('Remaining emails instructions')
    expect(second.schema).toBe(aiEmailsResponseSchema)
    expect(second.messages).toEqual([{ role: 'user', content: 'Generate Days 2 through 2.' }])
  })

  it('numbers phase 2 days by position and caps them at config.days', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 7, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({
        emails: [
          { day: 1, subject: 'S2', preview: 'P2', content: 'C2' },
          { day: 1, subject: 'S3', preview: 'P3', content: 'C3' },
          { day: 9, subject: 'extra', preview: '', content: '' },
        ],
      })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 3 },
      }) as never,
    )
    const events = await readStreamEvents(response)
    const emailEvents = events.filter((e) => e.type === 'email')

    expect(emailEvents.map((e) => [e.email?.day, e.email?.subject])).toEqual([
      [1, 'S1'],
      [2, 'S2'],
      [3, 'S3'],
    ])
  })

  it('saves the full batch when a campaignId is given', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({ emails: [{ day: 2, subject: 'S2', preview: 'P2', content: 'C2' }] })

    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never,
    )
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(saveEmailsMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, [
      expect.objectContaining({ day: 1, subject: 'S1' }),
      expect.objectContaining({ day: 2, subject: 'S2' }),
    ])
    expect(completeEvent?.emails?.map((e) => e.subject)).toEqual(['Subject 1', 'Subject 2'])
    expect(completeEvent?.warning).toBeUndefined()
  })

  it('includes warning when save fails', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    saveEmailsMock.mockRejectedValue(new Error('Save failed'))

    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never,
    )
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(completeEvent?.warning).toContain('Could not persist')
  })

  it('handles single day generation', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 1 },
      }) as never,
    )
    expect(response.status).toBe(200)

    const events = await readStreamEvents(response)
    const emailEvents = events.filter((e) => e.type === 'email')
    expect(emailEvents.length).toBe(1)
    expect(emailEvents[0]?.email?.day).toBe(1)
    expect(generateStructuredMock).toHaveBeenCalledOnce()
  })

  it('includes rate limit headers in stream response', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })
})
