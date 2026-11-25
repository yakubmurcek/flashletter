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
vi.mock('@/lib/ai', async (importOriginal) => {
  const { default: SDK } = await import('@anthropic-ai/sdk')
  const actual = await importOriginal<typeof import('@/lib/ai')>()
  return {
    AI_UNAVAILABLE_MESSAGE: actual.AI_UNAVAILABLE_MESSAGE,
    isAiUnavailableError: actual.isAiUnavailableError,
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
const upsertEmailsMock = vi.fn()
const deleteEmailsAfterDayMock = vi.fn()
const isOwnedByMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  // Use a class wrapper so vi.restoreAllMocks() can't strip the
  // implementation between tests.
  CampaignStorageService: class {
    saveEmails = (...args: unknown[]) => saveEmailsMock(...args)
    upsertEmails = (...args: unknown[]) => upsertEmailsMock(...args)
    deleteEmailsAfterDay = (...args: unknown[]) => deleteEmailsAfterDayMock(...args)
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
  email?: { day: number; subject: string; uuid?: string | null }
  emails?: Array<{ day: number; subject: string; uuid?: string | null }>
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
// The uuid the database gives each day, so tests can see what was saved.
const uuidForDay = (day: number) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(day).padStart(12, '0')}`

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
    upsertEmailsMock
      .mockReset()
      .mockImplementation(async (_id: string, emails: Array<{ day: number }>) =>
        emails.map((e) => ({ ...e, uuid: uuidForDay(e.day) })),
      )
    deleteEmailsAfterDayMock.mockReset().mockResolvedValue(undefined)
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

  it('says in plain words that Claude is down, without the raw API error', async () => {
    const error = Anthropic.APIError.generate(
      500,
      { type: 'error', error: { type: 'api_error', message: 'Internal server error' } },
      undefined,
      new Headers(),
    )
    generateStructuredMock.mockRejectedValue(error)

    const events = await readStreamEvents(await POST(buildRequest(validRequestBody) as never))
    const errorEvent = events.find((e) => e.type === 'error')

    expect(errorEvent?.message).toMatch(/^The AI writer is not reachable right now\./)
    expect(errorEvent?.message).not.toContain('api_error')
    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { error_type: 'ai_unavailable', api_route: '/api/generate-emails/stream' },
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

  it('asks again for the days a short reply left out', async () => {
    const email = (d: number) => ({ day: d, subject: `S${d}`, preview: `P${d}`, content: `C${d}` })
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [email(1)] })
      .mockResolvedValueOnce({ emails: [email(2)] })
      .mockResolvedValueOnce({ emails: [email(3), email(4)] })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 4 },
      }) as never,
    )
    const events = await readStreamEvents(response)

    expect(generateStructuredMock.mock.calls[2][0].messages).toEqual([
      { role: 'user', content: 'Generate Days 3 through 4.' },
    ])
    expect(events.filter((e) => e.type === 'email').map((e) => e.email?.day)).toEqual([1, 2, 3, 4])
    expect(events.at(-1)?.warning).toBeUndefined()
  })

  it('says so when the sequence still comes back short', async () => {
    const email = (d: number) => ({ day: d, subject: `S${d}`, preview: `P${d}`, content: `C${d}` })
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [email(1)] })
      .mockResolvedValueOnce({ emails: [email(2)] })
      .mockResolvedValueOnce({ emails: [] })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 4 },
      }) as never,
    )
    const events = await readStreamEvents(response)
    const complete = events.at(-1)

    expect(complete?.type).toBe('complete')
    expect(complete?.warning).toMatch(/2 of the 4 emails/)
  })

  it('writes a 30-email sequence in parallel batches', async () => {
    const email = (d: number) => ({ day: d, subject: `S${d}`, preview: `P${d}`, content: `C${d}` })
    generateStructuredMock.mockImplementation(async ({ messages }) => {
      const m = /Days? (\d+)(?: through (\d+))?/.exec(messages[0].content)!
      const from = Number(m[1])
      const to = Number(m[2] ?? m[1])
      return { emails: Array.from({ length: to - from + 1 }, (_, i) => email(from + i)) }
    })

    const response = await POST(
      buildRequest({
        ...validRequestBody,
        config: { ...validRequestBody.config, days: 30 },
      }) as never,
    )
    const events = await readStreamEvents(response)

    expect(generateStructuredMock.mock.calls.map((c) => c[0].messages[0].content)).toEqual([
      'Generate Day 1 only.',
      'Generate Days 2 through 11.',
      'Generate Days 12 through 21.',
      'Generate Days 22 through 30.',
    ])
    expect(events.filter((e) => e.type === 'email').map((e) => e.email?.day)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    )
  })

  it('keeps the finished batches when a later one fails', async () => {
    const email = (d: number) => ({ day: d, subject: `S${d}`, preview: `P${d}`, content: `C${d}` })
    generateStructuredMock.mockImplementation(async ({ messages }) => {
      const m = /Days? (\d+)(?: through (\d+))?/.exec(messages[0].content)!
      const from = Number(m[1])
      const to = Number(m[2] ?? m[1])
      if (from === 12) throw new Error('Overloaded')
      return { emails: Array.from({ length: to - from + 1 }, (_, i) => email(from + i)) }
    })

    const events = await readStreamEvents(
      await POST(
        buildRequest({
          ...validRequestBody,
          config: { ...validRequestBody.config, days: 15 },
        }) as never,
      ),
    )
    const complete = events.at(-1)

    expect(complete?.type).toBe('complete')
    expect(complete?.emails?.map((e) => e.day)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1))
    expect(complete?.warning).toMatch(/11 of the 15 emails/)
  })

  it('does not shift later days when an earlier batch stays short', async () => {
    const email = (d: number) => ({ day: d, subject: `S${d}`, preview: `P${d}`, content: `C${d}` })
    generateStructuredMock.mockImplementation(async ({ messages }) => {
      const m = /Days? (\d+)(?: through (\d+))?/.exec(messages[0].content)!
      const from = Number(m[1])
      const to = Number(m[2] ?? m[1])
      // Days 2..11 never include Day 11, even when asked again.
      const last = from <= 11 && to >= 11 ? 10 : to
      return {
        emails: Array.from({ length: Math.max(0, last - from + 1) }, (_, i) => email(from + i)),
      }
    })

    const events = await readStreamEvents(
      await POST(
        buildRequest({
          ...validRequestBody,
          config: { ...validRequestBody.config, days: 15 },
        }) as never,
      ),
    )
    const complete = events.at(-1)

    // Day 12's email must never be saved as Day 11.
    expect(complete?.emails?.map((e) => e.subject)).toEqual(
      Array.from({ length: 10 }, (_, i) => `S${i + 1}`),
    )
    expect(complete?.warning).toMatch(/10 of the 15 emails/)
  })

  it('lets the function run up to the 300s limit', async () => {
    const route = await import('@/app/api/generate-emails/stream/route')
    expect(route.maxDuration).toBe(300)
  })

  const withCampaign = (days = 2) =>
    buildRequest({
      ...validRequestBody,
      campaignId: VALID_CAMPAIGN_ID,
      config: { ...validRequestBody.config, days },
    }) as never

  it('saves Day 1 before sending it, so the editor gets its real id', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({ emails: [{ day: 2, subject: 'S2', preview: 'P2', content: 'C2' }] })

    const events = await readStreamEvents(await POST(withCampaign()))
    const emailEvents = events.filter((e) => e.type === 'email')

    expect(upsertEmailsMock.mock.calls[0]).toEqual([
      VALID_CAMPAIGN_ID,
      [expect.objectContaining({ day: 1, subject: 'S1' })],
    ])
    expect(emailEvents.map((e) => e.email?.uuid)).toEqual([uuidForDay(1), uuidForDay(2)])
  })

  it('saves the rest without rewriting Day 1 and trims days past the new end', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      // Asked for Days 2..4, got only one back: the old Days 3 and 4 must go.
      .mockResolvedValueOnce({ emails: [{ day: 2, subject: 'S2', preview: 'P2', content: 'C2' }] })
      // The re-ask for Days 3..4 comes back empty too.
      .mockResolvedValueOnce({ emails: [] })

    const events = await readStreamEvents(await POST(withCampaign(4)))
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(upsertEmailsMock).toHaveBeenCalledTimes(2)
    expect(upsertEmailsMock.mock.calls[1]).toEqual([
      VALID_CAMPAIGN_ID,
      [expect.objectContaining({ day: 2, subject: 'S2' })],
    ])
    expect(deleteEmailsAfterDayMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 2)
    expect(saveEmailsMock).not.toHaveBeenCalled()
    expect(completeEvent?.emails?.map((e) => [e.day, e.uuid])).toEqual([
      [1, uuidForDay(1)],
      [2, uuidForDay(2)],
    ])
    expect(completeEvent?.warning).toMatch(/2 of the 4 emails/)
  })

  it('trims old days after Day 1 for a one-day sequence', async () => {
    generateStructuredMock.mockResolvedValueOnce({
      emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }],
    })

    const events = await readStreamEvents(await POST(withCampaign(1)))

    expect(deleteEmailsAfterDayMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 1)
    expect(events.find((e) => e.type === 'complete')?.emails?.map((e) => e.uuid)).toEqual([
      uuidForDay(1),
    ])
  })

  // Bug: when the call for Days 2..N failed, nothing was saved. The editor
  // kept Day 1 with no database row, edits to it said "Saved" and were lost.
  it('keeps Day 1 saved and drops the old later days when the rest fails', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockRejectedValueOnce(new Error('AI response was cut off before it finished'))

    const events = await readStreamEvents(await POST(withCampaign(3)))

    expect(events.map((e) => e.type)).toEqual(['start', 'email', 'error'])
    expect(events[1].email?.uuid).toBe(uuidForDay(1))
    expect(upsertEmailsMock).toHaveBeenCalledTimes(1)
    // The database now matches the screen: the new Day 1 and nothing else.
    expect(deleteEmailsAfterDayMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 1)
  })

  it('touches nothing in the database when Day 1 itself fails', async () => {
    generateStructuredMock.mockRejectedValueOnce(new Error('Overloaded'))

    const events = await readStreamEvents(await POST(withCampaign(3)))

    expect(events.map((e) => e.type)).toEqual(['start', 'error'])
    expect(upsertEmailsMock).not.toHaveBeenCalled()
    expect(deleteEmailsAfterDayMock).not.toHaveBeenCalled()
  })

  it('does not drop the old later days when Day 1 could not be saved', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    upsertEmailsMock.mockRejectedValueOnce(new Error('db down'))
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockRejectedValueOnce(new Error('Overloaded'))

    const events = await readStreamEvents(await POST(withCampaign(3)))

    expect(events.map((e) => e.type)).toEqual(['start', 'email', 'error'])
    expect(events[1].email?.uuid).toBeNull()
    expect(deleteEmailsAfterDayMock).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('saves Day 1 at the end when the early save failed', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    upsertEmailsMock.mockRejectedValueOnce(new Error('db blip'))
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({ emails: [{ day: 2, subject: 'S2', preview: 'P2', content: 'C2' }] })

    const events = await readStreamEvents(await POST(withCampaign()))
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(upsertEmailsMock.mock.calls[1][1].map((e: { day: number }) => e.day)).toEqual([1, 2])
    expect(completeEvent?.emails?.map((e) => e.uuid)).toEqual([uuidForDay(1), uuidForDay(2)])
    expect(completeEvent?.warning).toBeUndefined()
    errSpy.mockRestore()
  })

  it('includes warning when save fails, and keeps the saved Day 1 id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockResolvedValueOnce({ emails: [{ subject: 'S2', preview: 'P2', content: 'C2' }] })
    upsertEmailsMock
      .mockImplementationOnce(async (_id: string, emails: Array<{ day: number }>) =>
        emails.map((e) => ({ ...e, uuid: uuidForDay(e.day) })),
      )
      .mockRejectedValueOnce(new Error('Save failed'))

    const events = await readStreamEvents(await POST(withCampaign()))
    const completeEvent = events.find((e) => e.type === 'complete')

    expect(completeEvent?.warning).toContain('Could not persist')
    expect(completeEvent?.emails?.map((e) => [e.day, e.uuid])).toEqual([
      [1, uuidForDay(1)],
      [2, null],
    ])
    errSpy.mockRestore()
  })

  // A newer run on the same campaign aborts this request. This run must
  // not save or trim anything after that, or it could undo the newer one.
  it('saves nothing once the client has gone', async () => {
    let finishDay1: (value: unknown) => void = () => {}
    generateStructuredMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishDay1 = resolve
      }),
    )
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(withCampaign(3))
    const reader = response.body!.getReader()
    await reader.read() // start
    await reader.cancel()
    finishDay1({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(upsertEmailsMock).not.toHaveBeenCalled()
    expect(deleteEmailsAfterDayMock).not.toHaveBeenCalled()
    expect(generateStructuredMock).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })

  // The user closes the tab while Days 2..N are written. Day 1 of this run
  // is already saved, so the run must still finish or trim its sequence.
  const cancelAfterDay1 = async (
    finishRest: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => void,
  ) => {
    let settleRest: { resolve: (v: unknown) => void; reject: (e: unknown) => void } | null = null
    generateStructuredMock
      .mockResolvedValueOnce({ emails: [{ day: 1, subject: 'S1', preview: 'P1', content: 'C1' }] })
      .mockReturnValueOnce(
        new Promise((resolve, reject) => {
          settleRest = { resolve, reject }
        }),
      )
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(withCampaign(3))
    const reader = response.body!.getReader()
    await reader.read() // start
    await reader.read() // Day 1
    await reader.cancel()
    finishRest(settleRest!.resolve, settleRest!.reject)
    await new Promise((resolve) => setTimeout(resolve, 10))
    errSpy.mockRestore()
  }

  it('finishes saving its own sequence after the client goes mid-run', async () => {
    await cancelAfterDay1((resolve) =>
      resolve({
        emails: [
          { subject: 'S2', preview: 'P2', content: 'C2' },
          { subject: 'S3', preview: 'P3', content: 'C3' },
        ],
      }),
    )

    expect(upsertEmailsMock).toHaveBeenCalledTimes(2)
    expect(upsertEmailsMock.mock.calls[1][1].map((e: { day: number }) => e.day)).toEqual([2, 3])
    expect(deleteEmailsAfterDayMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 3)
  })

  it('trims after its saved Day 1 when the rest fails after the client went', async () => {
    await cancelAfterDay1((_resolve, reject) => reject(new Error('Overloaded')))

    expect(upsertEmailsMock).toHaveBeenCalledTimes(1)
    expect(deleteEmailsAfterDayMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 1)
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

  it('makes every link in the generated emails absolute before saving or streaming', async () => {
    generateStructuredMock
      .mockResolvedValueOnce({
        emails: [{ subject: 'S1', preview: 'P1', content: 'Hi,\n\n[Sign up](/register)' }],
      })
      .mockResolvedValueOnce({
        emails: [
          { subject: 'S2', preview: 'P2', content: '[Pricing](#pricing) [x](javascript:x)' },
        ],
      })

    const events = await readStreamEvents(await POST(withCampaign()))
    const streamed = events
      .filter((e) => e.type === 'email')
      .map((e) => (e.email as { content?: string }).content)
    const saved = upsertEmailsMock.mock.calls.flatMap(([, emails]) =>
      (emails as Array<{ content: string }>).map((e) => e.content),
    )

    const day1 = 'Hi,\n\n[Sign up](https://example.com/register)'
    const day2 = '[Pricing](https://example.com/#pricing) [x](https://example.com/)'
    expect(streamed).toEqual([day1, day2])
    expect(saved).toEqual([day1, day2])
  })
})
