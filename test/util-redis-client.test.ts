// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

// One fake Upstash client class: counts constructions and records every call,
// so the tests can prove rate limits and the scrape cache share one instance.
const constructed: unknown[] = []
const calls: string[] = []
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(config: unknown) {
      constructed.push(config)
      // biome-ignore lint/correctness/noConstructorReturn: proxy records any method the libraries call
      return new Proxy(this, {
        get: (_target, prop) => {
          if (typeof prop !== 'string' || prop === 'then') return undefined
          return async (...args: unknown[]) => {
            calls.push(prop)
            if (prop === 'get') return null
            if (prop === 'evalsha' || prop === 'eval') return [1, 1]
            return args[0] ?? null
          }
        },
      })
    }
  },
}))

const REDIS_ENV = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
] as const

async function loadModules(env: Partial<Record<(typeof REDIS_ENV)[number], string>>) {
  vi.resetModules()
  constructed.length = 0
  calls.length = 0
  // '' counts as unset, so a local .env or CI secret cannot leak into a case.
  for (const name of REDIS_ENV) vi.stubEnv(name, env[name] ?? '')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const redisClient = await import('@/lib/utils/redis-client')
  const rateLimit = await import('@/lib/utils/rate-limit')
  const scraperCache = await import('@/lib/utils/scraper-cache')
  const { Ratelimit } = await import('@upstash/ratelimit')
  return { redisClient, rateLimit, scraperCache, Ratelimit }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('shared Redis client', () => {
  it('without Redis env: no client, in-memory rate limits, scrape cache misses', async () => {
    const { redisClient, rateLimit, scraperCache } = await loadModules({})

    expect(constructed).toHaveLength(0)
    expect(redisClient.getRedisClient()).toBeUndefined()
    expect(rateLimit.chatRateLimit).toBeInstanceOf(rateLimit.MemoryLimiter)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[rate-limit] Redis not configured'),
    )

    const result = await rateLimit.checkRateLimit(rateLimit.chatRateLimit, 'user-1')
    expect(result).toMatchObject({ success: true, limit: 10, remaining: 9 })

    await expect(scraperCache.getCachedScrapeData('https://example.com')).resolves.toEqual({
      data: null,
      fromCache: false,
    })
    await expect(scraperCache.isUrlCached('https://example.com')).resolves.toBe(false)
    expect(calls).toHaveLength(0)
  })

  it.each([
    [
      'UPSTASH_REDIS_REST_*',
      { UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't' },
    ],
    [
      'KV_REST_API_* (Vercel Marketplace)',
      { KV_REST_API_URL: 'https://k', KV_REST_API_TOKEN: 't' },
    ],
  ])('with %s: one client, used by rate limits and the scrape cache', async (_name, env) => {
    const { redisClient, rateLimit, scraperCache, Ratelimit } = await loadModules(env)

    expect(constructed).toEqual([{ url: Object.values(env)[0], token: 't' }])
    expect(redisClient.getRedisClient()).toBeDefined()
    expect(rateLimit.chatRateLimit).toBeInstanceOf(Ratelimit)
    expect(console.warn).not.toHaveBeenCalled()

    await rateLimit.checkRateLimit(rateLimit.chatRateLimit, 'user-1')
    expect(calls.some((c) => c === 'evalsha' || c === 'eval')).toBe(true)

    calls.length = 0
    await scraperCache.getCachedScrapeData('https://example.com')
    expect(calls).toContain('get')

    // Every caller still holds the one instance built at startup.
    expect(constructed).toHaveLength(1)
  })
})
