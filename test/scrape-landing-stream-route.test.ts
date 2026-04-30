import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ScrapeStreamEvent } from '@/lib/types/scrape-progress'

// Mock heavy dependencies before importing the route

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const getCachedScrapeDataMock = vi.fn()
const setCachedScrapeDataMock = vi.fn()
vi.mock('@/lib/utils/scraper-cache', () => ({
  getCachedScrapeData: (...args: unknown[]) => getCachedScrapeDataMock(...args),
  setCachedScrapeData: (...args: unknown[]) => setCachedScrapeDataMock(...args),
}))

const extractTextMock = vi.fn()
vi.mock('@/lib/utils/scraper', () => ({
  extractTextFromHTML: (...args: unknown[]) => extractTextMock(...args),
}))

const extractMetadataMock = vi.fn()
vi.mock('@/lib/utils/metadata-extractor', () => ({
  extractMetadata: (...args: unknown[]) => extractMetadataMock(...args),
}))

const scrapeWithPlaywrightMock = vi.fn()
const shouldUseDynamicScrapingMock = vi.fn()
vi.mock('@/lib/utils/playwright-scraper', () => ({
  scrapeWithPlaywright: (...args: unknown[]) => scrapeWithPlaywrightMock(...args),
  shouldUseDynamicScraping: (...args: unknown[]) => shouldUseDynamicScrapingMock(...args),
}))

const analyzeLandingPageMock = vi.fn()
vi.mock('@/lib/utils/analyzer', () => ({
  analyzeLandingPage: (...args: unknown[]) => analyzeLandingPageMock(...args),
}))

const checkRateLimitMock = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  scrapeLandingRateLimit: null,
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitHeaders: () => ({}),
}))

vi.mock('@/lib/utils/get-client-ip', () => ({
  getClientIp: () => '127.0.0.1',
}))

const getUserMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: () => getUserMock(),
    },
  }),
}))

// Import after all vi.mock calls
import { POST } from '@/app/api/scrape-landing/stream/route'

async function readStreamEvents(response: Response): Promise<ScrapeStreamEvent[]> {
  if (!response.body) return []
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: ScrapeStreamEvent[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (line) events.push(JSON.parse(line) as ScrapeStreamEvent)
    }
  }
  return events
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/scrape-landing/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validAnalysis = {
  valueProp: 'a',
  targetAudience: 'b',
  primaryCTA: 'c',
  toneFingerprint: 'd',
  objections: [],
  proofPoints: [],
  angles: ['x'],
  opportunities: [],
}

describe('POST /api/scrape-landing/stream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Default to an authenticated user so the route's auth gate doesn't
    // short-circuit every test; specific tests can override to test 401.
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-123' } } })
    getCachedScrapeDataMock.mockReset().mockResolvedValue({ fromCache: false, data: null })
    setCachedScrapeDataMock.mockReset().mockResolvedValue(true)
    extractTextMock.mockReset().mockReturnValue({
      content: '<p>Page</p>',
      wordCount: 42,
      extractionMethod: 'static',
    })
    extractMetadataMock.mockReset().mockReturnValue({
      title: 'Title',
      description: 'Desc',
      ogTitle: 'OG Title',
      ogSiteName: 'Example',
    })
    shouldUseDynamicScrapingMock.mockReset().mockReturnValue(false)
    scrapeWithPlaywrightMock.mockReset()
    analyzeLandingPageMock.mockReset().mockResolvedValue(validAnalysis)
    checkRateLimitMock.mockReset().mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 0,
    })

    // Mock global fetch for HTML retrieval
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<html><head><title>Test</title></head><body>Hi</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
  })

  it('returns 400 for invalid body', async () => {
    const response = await POST(buildRequest({ url: 'not-a-url' }) as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 401 when the caller has no Supabase session', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 429 when rate limit exceeded (not a stream)', async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: 100,
    })

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(429)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('happy path emits expected events in order', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson')

    const events = await readStreamEvents(response)
    const types = events.map((e) => e.type)
    const stages = events
      .filter((e): e is Extract<ScrapeStreamEvent, { type: 'stage' }> => e.type === 'stage')
      .map((e) => e.stageId)

    expect(types[types.length - 1]).toBe('complete')
    expect(stages).toEqual(['connecting', 'fetching', 'extracting', 'analyzing', 'synthesizing'])
  })

  it('includes analysis in complete event when analyzer succeeds', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e) => e.type === 'complete')
    expect(completeEvent?.type).toBe('complete')
    if (completeEvent?.type === 'complete') {
      expect(completeEvent.data.analysis?.valueProp).toBe('a')
    }
  })

  it('complete event still fires when analyzer throws (analysis undefined)', async () => {
    analyzeLandingPageMock.mockRejectedValue(new Error('openai exploded'))
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const events = await readStreamEvents(response)
    const completeEvent = events.find((e) => e.type === 'complete')
    expect(completeEvent).toBeDefined()
    if (completeEvent?.type === 'complete') {
      expect(completeEvent.data.analysis).toBeUndefined()
    }
    // No error event
    expect(events.find((e) => e.type === 'error')).toBeUndefined()
  })

  it('cache hit path: skips fetching, emits extracting with cached:true', async () => {
    getCachedScrapeDataMock.mockResolvedValue({
      fromCache: true,
      data: {
        content: '<p>Cached</p>',
        metadata: { title: 'Cached', ogTitle: 'Cached OG' },
        url: 'https://example.com',
        wordCount: 10,
        extractionMethod: 'static',
      },
      ttl: 3600,
    })

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const events = await readStreamEvents(response)
    const stages = events
      .filter((e): e is Extract<ScrapeStreamEvent, { type: 'stage' }> => e.type === 'stage')
      .map((e) => e.stageId)

    expect(stages).not.toContain('fetching')
    expect(stages).toEqual(['connecting', 'extracting', 'analyzing', 'synthesizing'])

    const extractingEvent = events.find(
      (e): e is Extract<ScrapeStreamEvent, { type: 'stage' }> =>
        e.type === 'stage' && e.stageId === 'extracting',
    )!
    expect(extractingEvent.context?.cached).toBe(true)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('emits error event when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('', { status: 500, statusText: 'Internal Server Error' }),
    )

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const events = await readStreamEvents(response)
    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    if (errorEvent?.type === 'error') {
      expect(errorEvent.message.toLowerCase()).toContain('failed to fetch')
    }
    expect(events.find((e) => e.type === 'complete')).toBeUndefined()
  })

  it('falls back from dynamic to static when Playwright throws', async () => {
    shouldUseDynamicScrapingMock.mockReturnValue(true)
    scrapeWithPlaywrightMock.mockRejectedValue(new Error('browser crashed'))

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const events = await readStreamEvents(response)
    expect(events.find((e) => e.type === 'complete')).toBeDefined()
  })

  it('uses Playwright directly when useDynamic=true is requested', async () => {
    scrapeWithPlaywrightMock.mockResolvedValue({
      content: '<p>Dyn</p>',
      metadata: { title: 'Dyn' },
      wordCount: 5,
      extractionMethod: 'dynamic',
      finalUrl: 'https://example.com',
      loadTime: 500,
    })

    const response = await POST(
      buildRequest({ url: 'https://example.com', useDynamic: true }) as never,
    )
    const events = await readStreamEvents(response)
    expect(events.find((e) => e.type === 'complete')).toBeDefined()
    expect(scrapeWithPlaywrightMock).toHaveBeenCalledWith('https://example.com')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sets Cache-Control: no-cache on the stream response', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.headers.get('Cache-Control')).toContain('no-cache')
  })

  it('sets X-Content-Type-Options: nosniff on the stream response', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})
