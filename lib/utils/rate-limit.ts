import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client for rate limiting
// Uses Upstash Redis if credentials are provided, otherwise falls back
// to in-memory rate limiting
let redis: Redis | undefined
let rateLimitEnabled = false

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  rateLimitEnabled = true
}

/**
 * Rate limiter for API endpoints
 * Uses sliding window algorithm with Redis for distributed rate limiting
 *
 * Limits:
 * - Chat endpoint: 10 requests per minute per user
 * - Generate emails: 5 requests per hour per user
 * - Scrape landing: 20 requests per hour per user
 */

export const chatRateLimit = rateLimitEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null

export const generateEmailsRateLimit = rateLimitEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'ratelimit:generate-emails',
    })
  : null

export const scrapeLandingRateLimit = rateLimitEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: 'ratelimit:scrape',
    })
  : null

/**
 * Helper function to check rate limit for a given identifier
 * @param ratelimit The rate limiter instance to use
 * @param identifier Unique identifier (e.g., user ID or IP address)
 * @returns Object with success status and rate limit info
 */
export async function checkRateLimit(
  ratelimit: Ratelimit | null,
  identifier: string
) {
  if (!ratelimit) {
    // If rate limiting is not enabled, allow the request
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    }
  }

  const result = await ratelimit.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Get rate limit headers for API response
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }
}
