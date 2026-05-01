import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCachedScrapeData,
  setCachedScrapeData,
  invalidateCachedScrapeData,
  getCacheStats,
  clearAllScrapeCache,
  getCacheTTL,
  isUrlCached,
  ScrapeCacheBatch,
  type CachedScrapeData,
} from '@/lib/utils/scraper-cache'
import * as redisClientModule from '@/lib/utils/redis-client'

// Provide an explicit factory: auto-mock would replace withRedisFallback with
// a stub returning undefined, which breaks every function that delegates to it.
vi.mock('@/lib/utils/redis-client', () => ({
  getRedisClient: vi.fn(),
  isRedisAvailable: vi.fn(() => true),
  withRedisFallback: vi.fn(async <T>(op: (client: unknown) => Promise<T>, fallback: T) => {
    const client = (
      vi.mocked(redisClientModule.getRedisClient) as unknown as () => unknown | undefined
    )()
    if (!client) return fallback
    try {
      return await op(client)
    } catch {
      return fallback
    }
  }),
  CacheKeys: {
    scrape: (url: string) => `scrape:${Buffer.from(url).toString('base64')}`,
    metadata: (url: string) => `metadata:${Buffer.from(url).toString('base64')}`,
  },
}))

describe('getCachedScrapeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null and fromCache=false when redis unavailable', async () => {
    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(undefined)

    const result = await getCachedScrapeData('http://example.com')

    expect(result.data).toBeNull()
    expect(result.fromCache).toBe(false)
  })

  it('returns cached data when found and not expired', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue({
        content: 'test content',
        metadata: { title: 'Test' },
        url: 'http://example.com',
        wordCount: 100,
        extractionMethod: 'static' as const,
        cachedAt: Date.now() - 1000,
        ttl: 3600000,
      }),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCachedScrapeData('http://example.com')

    expect(result.fromCache).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data?.content).toBe('test content')
  })

  it('returns null when cached data expired', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue({
        content: 'test',
        metadata: {},
        url: 'http://example.com',
        wordCount: 0,
        extractionMethod: 'static' as const,
        cachedAt: Date.now() - 10000,
        ttl: 1000, // Expired 9 seconds ago
      }),
      del: vi.fn().mockResolvedValue(1),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCachedScrapeData('http://example.com')

    expect(result.fromCache).toBe(false)
    expect(result.data).toBeNull()
    expect(mockRedis.del).toHaveBeenCalled()
  })

  it('returns TTL in result when cached', async () => {
    const now = Date.now()
    const ttlMs = 1000000
    const mockRedis = {
      get: vi.fn().mockResolvedValue({
        content: 'test',
        metadata: {},
        url: 'http://example.com',
        wordCount: 0,
        extractionMethod: 'static' as const,
        cachedAt: now,
        ttl: ttlMs,
      }),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCachedScrapeData('http://example.com')

    expect(result.ttl).toBeDefined()
    expect(result.ttl).toBeGreaterThan(0)
  })
})

describe('setCachedScrapeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('caches scrape data using withRedisFallback', async () => {
    const mockSetex = vi.fn().mockResolvedValue('OK')
    const mockRedis = {
      setex: mockSetex,
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const data: Omit<CachedScrapeData, 'cachedAt' | 'ttl'> = {
      content: 'test',
      metadata: { title: 'Test' },
      url: 'http://example.com',
      wordCount: 10,
      extractionMethod: 'static',
    }

    const result = await setCachedScrapeData('http://example.com', data)

    expect(result).toBe(true)
  })

  it('returns false when redis unavailable', async () => {
    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(undefined)

    const data: Omit<CachedScrapeData, 'cachedAt' | 'ttl'> = {
      content: 'test',
      metadata: {},
      url: 'http://example.com',
      wordCount: 0,
      extractionMethod: 'static',
    }

    const result = await setCachedScrapeData('http://example.com', data)

    expect(result).toBe(false)
  })
})

describe('invalidateCachedScrapeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes cache entry', async () => {
    const mockDel = vi.fn().mockResolvedValue(1)
    const mockRedis = {
      del: mockDel,
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await invalidateCachedScrapeData('http://example.com')

    expect(result).toBe(true)
    expect(mockDel).toHaveBeenCalled()
  })

  it('returns false when redis unavailable', async () => {
    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(undefined)

    const result = await invalidateCachedScrapeData('http://example.com')

    expect(result).toBe(false)
  })
})

describe('getCacheStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when redis unavailable', async () => {
    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(undefined)

    const result = await getCacheStats()

    expect(result).toBeNull()
  })

  it('returns cache stats when redis available', async () => {
    // Source uses SCAN (not KEYS); SCAN returns [nextCursor, keys] tuples and
    // the loop terminates when cursor returns to '0'. One round-trip suffices
    // when cursor === '0' on the first response.
    const mockRedis = {
      scan: vi.fn().mockResolvedValue(['0', ['scrape:key1', 'scrape:key2', 'other:key']]),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCacheStats()

    expect(result).not.toBeNull()
    expect(result?.totalKeys).toBe(3)
    expect(result?.scrapeKeys).toBe(2)
  })
})

describe('clearAllScrapeCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 0 when no scrape keys exist', async () => {
    const mockRedis = {
      scan: vi.fn().mockResolvedValue(['0', []]),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await clearAllScrapeCache()

    expect(result).toBe(0)
  })

  it('deletes all scrape keys and returns count', async () => {
    const mockDel = vi.fn().mockResolvedValue(2)
    const mockRedis = {
      scan: vi.fn().mockResolvedValue(['0', ['scrape:url1', 'scrape:url2']]),
      del: mockDel,
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await clearAllScrapeCache()

    expect(result).toBe(2)
    expect(mockDel).toHaveBeenCalled()
  })
})

describe('getCacheTTL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when redis unavailable', async () => {
    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(undefined)

    const result = await getCacheTTL('http://example.com')

    expect(result).toBeNull()
  })

  it('returns TTL in seconds', async () => {
    const mockRedis = {
      ttl: vi.fn().mockResolvedValue(3600),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCacheTTL('http://example.com')

    expect(result).toBe(3600)
  })

  it('returns null when TTL is 0 or negative', async () => {
    const mockRedis = {
      ttl: vi.fn().mockResolvedValue(-1),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await getCacheTTL('http://example.com')

    expect(result).toBeNull()
  })
})

describe('isUrlCached', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when URL is cached and not expired', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue({
        content: 'test',
        metadata: {},
        url: 'http://example.com',
        wordCount: 0,
        extractionMethod: 'static' as const,
        cachedAt: Date.now() - 1000,
        ttl: 3600000,
      }),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await isUrlCached('http://example.com')

    expect(result).toBe(true)
  })

  it('returns false when URL is not cached', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue(null),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const result = await isUrlCached('http://example.com')

    expect(result).toBe(false)
  })
})

describe('ScrapeCacheBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads all URLs and returns results', async () => {
    const mockRedis = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          content: 'data1',
          metadata: {},
          url: 'http://example1.com',
          wordCount: 0,
          extractionMethod: 'static' as const,
          cachedAt: Date.now() - 1000,
          ttl: 3600000,
        })
        .mockResolvedValueOnce(null),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const batch = new ScrapeCacheBatch(['http://example1.com', 'http://example2.com'])
    const results = await batch.loadAll()

    expect(results.size).toBe(2)
  })

  it('getCachedUrls returns only cached URLs', async () => {
    const mockRedis = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          content: 'data1',
          metadata: {},
          url: 'http://example1.com',
          wordCount: 0,
          extractionMethod: 'static' as const,
          cachedAt: Date.now() - 1000,
          ttl: 3600000,
        })
        .mockResolvedValueOnce(null),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const batch = new ScrapeCacheBatch(['http://example1.com', 'http://example2.com'])
    await batch.loadAll()

    const cached = batch.getCachedUrls()
    expect(cached).toHaveLength(1)
    expect(cached[0]).toBe('http://example1.com')
  })

  it('getUncachedUrls returns only uncached URLs', async () => {
    const mockRedis = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          content: 'data1',
          metadata: {},
          url: 'http://example1.com',
          wordCount: 0,
          extractionMethod: 'static' as const,
          cachedAt: Date.now() - 1000,
          ttl: 3600000,
        })
        .mockResolvedValueOnce(null),
    }

    vi.mocked(redisClientModule.getRedisClient).mockReturnValue(mockRedis as any)

    const batch = new ScrapeCacheBatch(['http://example1.com', 'http://example2.com'])
    await batch.loadAll()

    const uncached = batch.getUncachedUrls()
    expect(uncached).toHaveLength(1)
    expect(uncached[0]).toBe('http://example2.com')
  })
})
