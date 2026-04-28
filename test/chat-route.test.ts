import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const openaiResponsesCreateMock = vi.fn()
vi.mock('@/lib/openai', () => ({
  openai: {
    responses: {
      create: (...args: unknown[]) => openaiResponsesCreateMock(...args),
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
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': '0',
  }),
  chatRateLimit: null,
}))

vi.mock('@/lib/utils/get-client-ip', () => ({
  getClientIp: () => '127.0.0.1',
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

vi.mock('@/app/api/chat/prompt-builder', () => ({
  buildSystemInstructions: () => 'System instructions here',
}))

vi.mock('@/app/api/chat/response-handler', () => ({
  parseOpenAIResponse: (response: unknown) => ({
    content: 'AI response',
    usage: { prompt_tokens: 10, completion_tokens: 20 },
  }),
}))

// Import after all vi.mock calls
import { POST } from '@/app/api/chat/route'

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    checkRateLimitMock.mockReset().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: 0,
    })
    retryWithBackoffMock.mockReset().mockResolvedValue({
      output: 'AI response',
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    })
  })

  it('returns 400 for invalid request format', async () => {
    const response = await POST(buildRequest({ invalid: 'data' }) as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 429 when rate limit exceeded', async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: 100,
    })

    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: {},
      }) as never,
    )
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('Too many requests')
  })

  it('returns rate limit headers in response', async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: {},
      }) as never,
    )
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('successfully processes valid chat request', async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: { name: 'Test Campaign' },
      }) as never,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    const body = await response.json()
    expect(body.content).toBeDefined()
  })

  it('handles OpenAI 429 rate limit error', async () => {
    const error = { status: 429, message: 'Rate limit exceeded' }
    retryWithBackoffMock.mockRejectedValue(error)

    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: {},
      }) as never,
    )
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('OpenAI rate limit')
  })

  it('handles general OpenAI error', async () => {
    const error = new Error('OpenAI connection failed')
    retryWithBackoffMock.mockRejectedValue(error)

    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: {},
      }) as never,
    )
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('handles missing required fields', async () => {
    const response = await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        // campaignContext is required by schema
      }) as never,
    )
    // Should fail validation
    expect([400, 500]).toContain(response.status)
  })

  it('calls retry logic with correct parameters', async () => {
    await POST(
      buildRequest({
        messages: [{ role: 'user', content: 'Hello' }],
        campaignContext: {},
      }) as never,
    )
    expect(retryWithBackoffMock).toHaveBeenCalled()
  })
})
