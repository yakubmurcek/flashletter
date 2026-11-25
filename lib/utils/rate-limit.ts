import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client for rate limiting
// Uses Upstash Redis if credentials are provided, otherwise falls back
// to in-memory rate limiting
let redis: Redis | undefined

/** Shared Upstash client, or undefined when Redis is not configured. */
export function getRedis(): Redis | undefined {
  return redis
}

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
 * Per-user limits (per-IP limits for the AI routes and the test-send daily
 * cap are defined below):
 * - Chat endpoint: 10 requests per minute
 * - Generate emails: 5 requests per hour
 * - Scrape landing: 20 requests per hour
 */
export const chatRateLimit = createLimiter(10, '1 m', 'flashletter:ratelimit:chat')
export const generateEmailsRateLimit = createLimiter(
  5,
  '1 h',
  'flashletter:ratelimit:generate-emails',
)
export const scrapeLandingRateLimit = createLimiter(20, '1 h', 'flashletter:ratelimit:scrape')

// Per-IP limits on the AI routes, applied on top of the per-user ones above.
// Anonymous sign-in mints a fresh user id on every call, so per-user limits
// alone don't stop one client from looping. Kept generous because offices and
// mobile carriers put many real users behind one IP. Both scrape routes share
// one budget.
export const chatIpRateLimit = createLimiter(60, '10 m', 'flashletter:ratelimit:chat-ip')
export const generateEmailsIpRateLimit = createLimiter(
  10,
  '1 h',
  'flashletter:ratelimit:generate-emails-ip',
)
export const scrapeLandingIpRateLimit = createLimiter(20, '10 m', 'flashletter:ratelimit:scrape-ip')

// Test-send: 5/hr/user keeps a curious user from spamming themselves; the
// route also applies a 20/day/IP cap separately to slow shared-IP abuse and
// keep us under Resend's free-tier 3k/mo with headroom.
// Public forms anyone can post to without an account: a bot must not fill the
// waitlist with junk or unsubscribe people in bulk.
export const waitlistIpRateLimit = createLimiter(10, '10 m', 'flashletter:ratelimit:waitlist-ip')
export const unsubscribeIpRateLimit = createLimiter(
  10,
  '10 m',
  'flashletter:ratelimit:unsubscribe-ip',
)

// Each checkout call creates a Stripe session (and maybe a customer).
export const checkoutRateLimit = createLimiter(10, '10 m', 'flashletter:ratelimit:checkout')

export const sendTestEmailRateLimit = createLimiter(5, '1 h', 'flashletter:ratelimit:send-test')
export const sendTestEmailIpRateLimit = createLimiter(
  20,
  '1 d',
  'flashletter:ratelimit:send-test-ip',
)

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
 * Per-IP limit for public forms. An unknown IP ('anonymous': no proxy headers,
 * e.g. local dev) is not limited, so visitors never share one global bucket.
 */
export async function checkIpRateLimit(ipLimiter: Limiter | null, ip: string) {
  return checkRateLimit(ip === 'anonymous' ? null : ipLimiter, ip)
}

/**
 * Checks the per-user limit, then (only if that passes) the per-IP one.
 * Returns the result of whichever limit refused the request, so the route's
 * 429 headers describe the limit that actually blocked; on success, returns
 * the per-user result. An unknown IP ('anonymous', e.g. local dev with no
 * proxy headers) skips the IP check instead of sharing one global bucket.
 */
export async function checkUserAndIpRateLimit(
  userLimiter: Limiter | null,
  ipLimiter: Limiter | null,
  userId: string,
  ip: string,
) {
  const userResult = await checkRateLimit(userLimiter, userId)
  if (!userResult.success || ip === 'anonymous') return userResult

  const ipResult = await checkRateLimit(ipLimiter, `ip:${ip}`)
  return ipResult.success ? userResult : ipResult
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
