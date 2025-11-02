import { getRedisClient, withRedisFallback, CacheKeys } from './redis-client'
import { SCRAPE_CACHE_TTL } from '@/lib/constants/app'
import type { ExtractedMetadata } from './metadata-extractor'

/**
 * Redis-based caching layer for scraped content
 * Provides cache-first strategy with TTL and graceful fallback
 */

export interface CachedScrapeData {
  content: string
  metadata: ExtractedMetadata
  url: string
  wordCount: number
  extractionMethod: 'static' | 'dynamic'
  cachedAt: number
  ttl: number
}

export interface CacheResult<T> {
  data: T | null
  fromCache: boolean
  ttl?: number
}

/**
 * Get cached scrape data for a URL
 * @param url URL to look up in cache
 * @returns Cached data or null if not found
 */
export async function getCachedScrapeData(
  url: string
): Promise<CacheResult<CachedScrapeData>> {
  const redis = getRedisClient()
  if (!redis) {
    return { data: null, fromCache: false }
  }

  const cacheKey = CacheKeys.scrape(url)

  try {
    const cached = await redis.get<CachedScrapeData>(cacheKey)

    if (cached) {
      // Check if cache is still valid
      const now = Date.now()
      const isExpired = cached.cachedAt + cached.ttl < now

      if (!isExpired) {
        return {
          data: cached,
          fromCache: true,
          ttl: cached.cachedAt + cached.ttl - now,
        }
      } else {
        // Cache expired, remove it
        await redis.del(cacheKey)
      }
    }

    return { data: null, fromCache: false }
  } catch (error) {
    console.warn('Failed to get cached scrape data:', error)
    return { data: null, fromCache: false }
  }
}

/**
 * Cache scrape data for a URL
 * @param url URL to cache data for
 * @param data Scrape data to cache
 * @param ttl Time to live in seconds (optional, uses default if not provided)
 * @returns true if cached successfully, false otherwise
 */
export async function setCachedScrapeData(
  url: string,
  data: Omit<CachedScrapeData, 'cachedAt' | 'ttl'>,
  ttl?: number
): Promise<boolean> {
  const cacheKey = CacheKeys.scrape(url)
  const cacheTTL = ttl || SCRAPE_CACHE_TTL

  const cacheData: CachedScrapeData = {
    ...data,
    cachedAt: Date.now(),
    ttl: cacheTTL * 1000, // Convert to milliseconds
  }

  return await withRedisFallback(async (redis) => {
    await redis.setex(cacheKey, cacheTTL, JSON.stringify(cacheData))
    return true
  }, false)
}

/**
 * Invalidate cached scrape data for a URL
 * @param url URL to invalidate cache for
 * @returns true if invalidated successfully, false otherwise
 */
export async function invalidateCachedScrapeData(
  url: string
): Promise<boolean> {
  const cacheKey = CacheKeys.scrape(url)

  return await withRedisFallback(async (redis) => {
    await redis.del(cacheKey)
    return true
  }, false)
}

/**
 * Get cache statistics for monitoring
 * @returns Cache statistics or null if Redis unavailable
 */
export async function getCacheStats(): Promise<{
  totalKeys: number
  scrapeKeys: number
  memoryUsage: string
} | null> {
  return await withRedisFallback(async (redis) => {
    // Get basic statistics
    const keys = await redis.keys('*')
    const scrapeKeys = keys.filter((key) => key.startsWith('scrape:')).length

    return {
      totalKeys: keys.length,
      scrapeKeys,
      memoryUsage: 'unknown', // Simplified for compatibility
    }
  }, null)
}

/**
 * Clear all scrape cache entries
 * @returns Number of keys cleared
 */
export async function clearAllScrapeCache(): Promise<number> {
  return await withRedisFallback(async (redis) => {
    const keys = await redis.keys('scrape:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    return keys.length
  }, 0)
}

/**
 * Get cache TTL for a URL
 * @param url URL to check TTL for
 * @returns TTL in seconds, or null if not cached
 */
export async function getCacheTTL(url: string): Promise<number | null> {
  const cacheKey = CacheKeys.scrape(url)

  return await withRedisFallback(async (redis) => {
    const ttl = await redis.ttl(cacheKey)
    return ttl > 0 ? ttl : null
  }, null)
}

/**
 * Check if URL is currently cached
 * @param url URL to check
 * @returns true if cached and not expired
 */
export async function isUrlCached(url: string): Promise<boolean> {
  const result = await getCachedScrapeData(url)
  return result.fromCache && result.data !== null
}

/**
 * Batch operations for multiple URLs
 */
export class ScrapeCacheBatch {
  private urls: string[] = []
  private results: Map<string, CacheResult<CachedScrapeData>> = new Map()

  constructor(urls: string[]) {
    this.urls = urls
  }

  /**
   * Load all URLs from cache in parallel
   */
  async loadAll(): Promise<Map<string, CacheResult<CachedScrapeData>>> {
    const promises = this.urls.map(async (url) => {
      const result = await getCachedScrapeData(url)
      this.results.set(url, result)
      return { url, result }
    })

    await Promise.all(promises)
    return this.results
  }

  /**
   * Get result for a specific URL
   */
  getResult(url: string): CacheResult<CachedScrapeData> | undefined {
    return this.results.get(url)
  }

  /**
   * Get all cached URLs
   */
  getCachedUrls(): string[] {
    return Array.from(this.results.entries())
      .filter(([, result]) => result.fromCache)
      .map(([url]) => url)
  }

  /**
   * Get all uncached URLs
   */
  getUncachedUrls(): string[] {
    return Array.from(this.results.entries())
      .filter(([, result]) => !result.fromCache)
      .map(([url]) => url)
  }
}
