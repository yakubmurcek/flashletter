import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const checkRateLimitMock = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  scrapeLandingRateLimit: null,
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getRateLimitHeaders: () => ({
    'X-RateLimit-Limit': '20',
    'X-RateLimit-Remaining': '19',
    'X-RateLimit-Reset': '0',
  }),
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

// Import after all vi.mock calls
import { POST } from '@/app/api/scrape-landing/route'

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/scrape-landing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/scrape-landing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getCachedScrapeDataMock.mockReset().mockResolvedValue({ fromCache: false, data: null })
    setCachedScrapeDataMock.mockReset().mockResolvedValue(true)
    extractTextMock.mockReset().mockReturnValue({
      content: '<p>Page content</p>',
      wordCount: 42,
      extractionMethod: 'static',
    })
    extractMetadataMock.mockReset().mockReturnValue({
      title: 'Page Title',
      description: 'Page description',
      ogTitle: 'OG Title',
      ogSiteName: 'Example',
    })
    shouldUseDynamicScrapingMock.mockReset().mockReturnValue(false)
    scrapeWithPlaywrightMock.mockReset()
    checkRateLimitMock.mockReset().mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: 0,
    })

    // Mock global fetch for HTML retrieval
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<html><head><title>Test</title></head><body>Content</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )
  })

  it('returns 400 for invalid URL', async () => {
    const response = await POST(buildRequest({ url: 'not-a-url' }) as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('returns 400 when url is missing', async () => {
    const response = await POST(buildRequest({ useDynamic: true }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limit exceeded', async () => {
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

  it('returns cached result when available', async () => {
    getCachedScrapeDataMock.mockResolvedValue({
      fromCache: true,
      data: {
        content: '<p>Cached content</p>',
        metadata: { title: 'Cached', ogTitle: 'Cached OG' },
        url: 'https://example.com',
        wordCount: 10,
        extractionMethod: 'static',
      },
      ttl: 3600,
    })

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Cache-Status')).toBe('HIT')
    expect(global.fetch).not.toHaveBeenCalled()

    const body = await response.json()
    expect(body.stats.cached).toBe(true)
  })

  it('happy path: static scraping with cache miss', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('X-Cache-Status')).toBe('MISS')
    expect(response.headers.get('X-Extraction-Method')).toBe('static')

    const body = await response.json()
    expect(body.content).toBeDefined()
    expect(body.metadata).toBeDefined()
    expect(body.url).toBeDefined()
    expect(body.stats.wordCount).toBe(42)
    expect(body.stats.cached).toBe(false)
    expect(setCachedScrapeDataMock).toHaveBeenCalled()
  })

  it('switches to dynamic scraping when indicated', async () => {
    shouldUseDynamicScrapingMock.mockReturnValue(true)
    scrapeWithPlaywrightMock.mockResolvedValue({
      content: '<p>Dynamic content</p>',
      metadata: { title: 'Dynamic', ogTitle: 'Dynamic OG' },
      wordCount: 50,
      extractionMethod: 'dynamic',
      finalUrl: 'https://example.com/redirected',
      loadTime: 1500,
    })

    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Extraction-Method')).toBe('dynamic')

    const body = await response.json()
    expect(body.stats.extractionMethod).toBe('dynamic')
    expect(body.stats.loadTime).toBe(1500)
  })

  it('uses useDynamic=true flag to force playwright', async () => {
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
    expect(response.status).toBe(200)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(scrapeWithPlaywrightMock).toHaveBeenCalled()
  })

  it('falls back to static when playwright fails', async () => {
    scrapeWithPlaywrightMock.mockRejectedValue(new Error('Browser crashed'))

    const response = await POST(
      buildRequest({ url: 'https://example.com', useDynamic: true }) as never,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.stats.extractionMethod).toBe('static')
  })

  it('returns 400 when fetch fails with bad status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('', { status: 500, statusText: 'Internal Server Error' }),
    )

    // Source maps "Failed to fetch" errors to 400 (the upstream error is the
    // user's URL, not our problem) — only generic / dynamic-scraping errors
    // become 500.
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/having trouble/i)
    expect(JSON.stringify(body)).not.toMatch(/500|Internal Server Error|Failed to fetch/)
  })

  it('does not leak a raw network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      new TypeError('fetch failed', {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND x'), { code: 'ECONNRESET' }),
      }),
    )
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    const body = await response.json()
    expect(body.error).toMatch(/couldn't reach/i)
    expect(JSON.stringify(body)).not.toMatch(/fetch failed|ECONNRESET|ENOTFOUND/)
  })

  it('includes rate limit headers in response', async () => {
    const response = await POST(buildRequest({ url: 'https://example.com' }) as never)
    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })
})
