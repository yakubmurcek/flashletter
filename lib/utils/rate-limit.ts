import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client for rate limiting
// Uses Upstash Redis if credentials are provided, otherwise falls back
// to in-memory rate limiting
let redis: Redis | undefined

// The Upstash integration on the Vercel Marketplace injects KV_REST_API_*;
// a manually created Upstash database uses UPSTASH_REDIS_REST_*.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken })
} else {
  console.warn(
    '[rate-limit] Redis not configured — using in-memory limits per server instance. ' +
      'Set UPSTASH_REDIS_REST_URL/_TOKEN (or connect Upstash on Vercel) for shared limits.',
  )
}

export interface Limiter {
  limit(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }>
}

/**
 * Fixed-window counter kept in this server instance's memory. Weaker than Redis
 * (each serverless instance counts on its own and forgets on cold start), but
 * still stops a single client from looping on the AI routes.
 */
export class MemoryLimiter implements Limiter {
  private hits = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  async limit(identifier: string) {
    const now = Date.now()
    let entry = this.hits.get(identifier)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs }
      this.hits.set(identifier, entry)
      if (this.hits.size > 10_000) {
        for (const [key, value] of this.hits) if (value.resetAt <= now) this.hits.delete(key)
      }
    }
    entry.count++
    return {
      success: entry.count <= this.max,
      limit: this.max,
      remaining: Math.max(0, this.max - entry.count),
      reset: entry.resetAt,
    }
  }
}

type Window = `${number} ${'m' | 'h' | 'd'}`
const WINDOW_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 }

function createLimiter(max: number, window: Window, prefix: string): Limiter {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: true,
      prefix,
    })
  }
  const [amount, unit] = window.split(' ') as [string, keyof typeof WINDOW_MS]
  return new MemoryLimiter(max, Number(amount) * WINDOW_MS[unit])
}

/**
 * Limits (per user, IP for the test-send daily cap):
 * - Chat endpoint: 10 requests per minute
 * - Generate emails: 5 requests per hour
 * - Scrape landing: 20 requests per hour
 */
export const chatRateLimit = createLimiter(10, '1 m', 'ratelimit:chat')
export const generateEmailsRateLimit = createLimiter(5, '1 h', 'ratelimit:generate-emails')
export const scrapeLandingRateLimit = createLimiter(20, '1 h', 'ratelimit:scrape')

// Test-send: 5/hr/user keeps a curious user from spamming themselves; the
// route also applies a 20/day/IP cap separately to slow shared-IP abuse and
// keep us under Resend's free-tier 3k/mo with headroom.
export const sendTestEmailRateLimit = createLimiter(5, '1 h', 'ratelimit:send-test')
export const sendTestEmailIpRateLimit = createLimiter(20, '1 d', 'ratelimit:send-test-ip')

/**
 * Helper function to check rate limit for a given identifier
 * @param ratelimit The rate limiter instance to use
 * @param identifier Unique identifier (e.g., user ID or IP address)
 * @returns Object with success status and rate limit info
 */
export async function checkRateLimit(ratelimit: Limiter | null, identifier: string) {
  if (!ratelimit) {
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
export function getRateLimitHeaders(limit: number, remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }
}
