import { Redis } from '@upstash/redis'

/**
 * The app's only Upstash Redis client: rate limits, the scrape cache and the
 * billing plan cache all use it. Undefined when Redis is not configured.
 */

let redis: Redis | undefined

// The Upstash integration on the Vercel Marketplace injects KV_REST_API_*;
// a manually created Upstash database uses UPSTASH_REDIS_REST_*.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken })
}

/**
 * Get the Redis client instance
 * @returns Redis client or undefined if not available
 */
export function getRedisClient(): Redis | undefined {
  return redis
}

/**
 * Execute a Redis operation with error handling
 * @param operation Function that performs Redis operations
 * @param fallbackValue Value to return if Redis operation fails
 * @returns Result of operation or fallback value
 */
export async function withRedisFallback<T>(
  operation: (client: Redis) => Promise<T>,
  fallbackValue: T,
): Promise<T> {
  if (!redis) {
    return fallbackValue
  }

  try {
    return await operation(redis)
  } catch (error) {
    console.warn('Redis operation failed, using fallback:', error)
    return fallbackValue
  }
}

/**
 * Cache key generators for different data types
 */
export const CacheKeys = {
  // Prefixed like every other key: the Redis store is shared with other apps.
  scrape: (url: string) => `flashletter:scrape:${Buffer.from(url).toString('base64')}`,
  metadata: (url: string) => `flashletter:metadata:${Buffer.from(url).toString('base64')}`,
} as const
