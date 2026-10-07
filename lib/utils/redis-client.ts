import { Redis } from '@upstash/redis'

/**
 * Shared Redis client for caching and other operations
 * Reuses the same Redis instance as rate limiting for efficiency
 */

let redis: Redis | undefined
let redisAvailable = false

// Initialize Redis client if credentials are available
// Same env fallback as rate-limit.ts (Vercel Marketplace injects KV_REST_API_*).
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken })
  redisAvailable = true
}

/**
 * Get the Redis client instance
 * @returns Redis client or undefined if not available
 */
export function getRedisClient(): Redis | undefined {
  return redis
}

/**
 * Check if Redis is available
 * @returns true if Redis is configured and available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable
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
  scrape: (url: string) => `scrape:${Buffer.from(url).toString('base64')}`,
  metadata: (url: string) => `metadata:${Buffer.from(url).toString('base64')}`,
} as const
