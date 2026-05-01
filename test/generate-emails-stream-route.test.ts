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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamEvent = any
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
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
      },
      usage: { prompt_tokens: 100, completion_tokens: 200 },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
      },
      usage: { prompt_tokens: 50, completion_tokens: 100 },
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')

    const events = await readStreamEvents(response)
    expect(events.length).toBeGreaterThan(0)

    const startEvent = events.find((e: any) => e.type === 'start')
    expect(startEvent).toBeDefined()
    expect(startEvent?.total).toBe(2)
  })

  it('emits email events in correct order', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
      },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
      },
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)
    const emailEvents = events.filter((e: any) => e.type === 'email')

    expect(emailEvents.length).toBe(2)
    expect(emailEvents[0]?.email?.day).toBe(1)
    expect(emailEvents[1]?.email?.day).toBe(2)
  })

  it('includes complete event with emails at end', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }],
      },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: {
        emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }],
      },
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e: any) => e.type === 'complete')

    expect(completeEvent).toBeDefined()
    expect(completeEvent?.type).toBe('complete')
    expect(completeEvent?.emails).toBeDefined()
    expect(Array.isArray(completeEvent?.emails)).toBe(true)
  })

  it('sets correct streaming headers', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }] },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }] },
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('Cache-Control')).toContain('no-cache')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('handles OpenAI error and emits error event', async () => {
    retryWithBackoffMock.mockRejectedValue(new Error('OpenAI failed'))

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')

    const events = await readStreamEvents(response)
    const errorEvent = events.find((e: any) => e.type === 'error')

    expect(errorEvent).toBeDefined()
    expect(errorEvent?.type).toBe('error')
    expect(errorEvent?.message).toBeDefined()
  })

  it('includes warning when save fails', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }] },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }] },
    })

    saveEmailsMock.mockRejectedValue(new Error('Save failed'))

    const response = await POST(
      buildRequest({ ...validRequestBody, campaignId: VALID_CAMPAIGN_ID }) as never,
    )
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e: any) => e.type === 'complete')

    expect(completeEvent?.warning).toContain('Could not persist')
  })

  it('handles single day generation', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }] },
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 1 },
      }) as never,
    )
    expect(response.status).toBe(200)

    const events = await readStreamEvents(response)
    const emailEvents = events.filter((e: any) => e.type === 'email')
    expect(emailEvents.length).toBe(1)
    expect(emailEvents[0]?.email?.day).toBe(1)
  })

  it('includes rate limit headers in stream response', async () => {
    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }] },
    })

    retryWithBackoffMock.mockResolvedValueOnce({
      output_parsed: { emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }] },
    })

    const response = await POST(buildRequest(validRequestBody) as never)
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })
})
