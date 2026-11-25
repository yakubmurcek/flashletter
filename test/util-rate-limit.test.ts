import { describe, it, expect, vi } from 'vitest'
import {
  checkRateLimit,
  checkUserAndIpRateLimit,
  getRateLimitHeaders,
  MemoryLimiter,
} from '@/lib/utils/rate-limit'
import type { Ratelimit } from '@upstash/ratelimit'

describe('checkRateLimit', () => {
  it('returns success=true when no limiter provided', async () => {
    const result = await checkRateLimit(null, 'user-123')
    expect(result.success).toBe(true)
    expect(result.limit).toBe(0)
    expect(result.remaining).toBe(0)
    expect(result.reset).toBe(0)
  })

  it('calls limiter.limit() when limiter exists', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 1000,
      pending: Promise.resolve(),
    })

    const mockRateLimiter = {
      limit: mockLimit,
    } as unknown as Ratelimit

    const result = await checkRateLimit(mockRateLimiter, 'user-123')

    expect(mockLimit).toHaveBeenCalledWith('user-123')
    expect(result.success).toBe(true)
    expect(result.limit).toBe(10)
    expect(result.remaining).toBe(9)
    expect(result.reset).toBe(1000)
  })

  it('returns success=false when rate limit exceeded', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 1000,
      pending: Promise.resolve(),
    })

    const mockRateLimiter = {
      limit: mockLimit,
    } as unknown as Ratelimit

    const result = await checkRateLimit(mockRateLimiter, 'user-123')

    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('passes identifier to limiter', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 5,
      reset: 500,
      pending: Promise.resolve(),
    })

    const mockRateLimiter = {
      limit: mockLimit,
    } as unknown as Ratelimit

    const testId = 'unique-user-id-456'
    await checkRateLimit(mockRateLimiter, testId)

    expect(mockLimit).toHaveBeenCalledWith(testId)
  })

  it('handles multiple calls with different identifiers', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 8,
      reset: 1000,
      pending: Promise.resolve(),
    })

    const mockRateLimiter = {
      limit: mockLimit,
    } as unknown as Ratelimit

    await checkRateLimit(mockRateLimiter, 'user-1')
    await checkRateLimit(mockRateLimiter, 'user-2')

    expect(mockLimit).toHaveBeenCalledTimes(2)
    expect(mockLimit).toHaveBeenNthCalledWith(1, 'user-1')
    expect(mockLimit).toHaveBeenNthCalledWith(2, 'user-2')
  })

  it('returns result object with correct shape', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 50,
      reset: 2000,
      pending: Promise.resolve(),
    })

    const mockRateLimiter = {
      limit: mockLimit,
    } as unknown as Ratelimit

    const result = await checkRateLimit(mockRateLimiter, 'id')

    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('limit')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('reset')
    expect(Object.keys(result)).toHaveLength(4)
  })
})

describe('checkUserAndIpRateLimit', () => {
  it('blocks one IP that rotates through fresh user ids', async () => {
    // Anonymous sign-in mints a new user per call, so the per-user limiter
    // alone never trips. The IP limiter must catch it.
    const perUser = new MemoryLimiter(10, 60_000)
    const perIp = new MemoryLimiter(3, 60_000)
    const results = []
    for (let i = 0; i < 4; i++) {
      results.push(await checkUserAndIpRateLimit(perUser, perIp, `anon-${i}`, '203.0.113.5'))
    }
    expect(results.map((r) => r.success)).toEqual([true, true, true, false])
    // The 429 headers describe the limit that actually blocked.
    expect(results[3].limit).toBe(3)
    expect(results[3].remaining).toBe(0)
  })

  it('keeps separate IPs on separate budgets', async () => {
    const perUser = new MemoryLimiter(10, 60_000)
    const perIp = new MemoryLimiter(1, 60_000)
    expect((await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')).success).toBe(true)
    expect((await checkUserAndIpRateLimit(perUser, perIp, 'u2', '198.51.100.7')).success).toBe(true)
  })

  it('still enforces the per-user limit and reports it when that one blocks', async () => {
    const perUser = new MemoryLimiter(1, 60_000)
    const perIp = new MemoryLimiter(100, 60_000)
    await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    const blocked = await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    expect(blocked.success).toBe(false)
    expect(blocked.limit).toBe(1)
  })

  it('does not spend IP budget on a request the per-user limit already refused', async () => {
    const perUser = new MemoryLimiter(1, 60_000)
    const perIp = new MemoryLimiter(2, 60_000)
    await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    expect((await checkUserAndIpRateLimit(perUser, perIp, 'u2', '203.0.113.5')).success).toBe(true)
  })

  it('returns the per-user result when both pass', async () => {
    const perUser = new MemoryLimiter(10, 60_000)
    const perIp = new MemoryLimiter(100, 60_000)
    const result = await checkUserAndIpRateLimit(perUser, perIp, 'u1', '203.0.113.5')
    expect(result).toMatchObject({ success: true, limit: 10, remaining: 9 })
  })

  it('skips the IP limiter when the IP is unknown, so local requests do not share one bucket', async () => {
    const perUser = new MemoryLimiter(10, 60_000)
    const perIp = { limit: vi.fn() }
    const result = await checkUserAndIpRateLimit(perUser, perIp, 'u1', 'anonymous')
    expect(result.success).toBe(true)
    expect(perIp.limit).not.toHaveBeenCalled()
  })
})

describe('getRateLimitHeaders', () => {
  it('returns headers object with rate limit info', () => {
    const headers = getRateLimitHeaders(100, 50, 1000)

    expect(headers['X-RateLimit-Limit']).toBe('100')
    expect(headers['X-RateLimit-Remaining']).toBe('50')
    expect(headers['X-RateLimit-Reset']).toBe('1000')
  })

  it('converts numbers to strings', () => {
    const headers = getRateLimitHeaders(10, 5, 2000)

    expect(typeof headers['X-RateLimit-Limit']).toBe('string')
    expect(typeof headers['X-RateLimit-Remaining']).toBe('string')
    expect(typeof headers['X-RateLimit-Reset']).toBe('string')
  })

  it('handles zero values', () => {
    const headers = getRateLimitHeaders(0, 0, 0)

    expect(headers['X-RateLimit-Limit']).toBe('0')
    expect(headers['X-RateLimit-Remaining']).toBe('0')
    expect(headers['X-RateLimit-Reset']).toBe('0')
  })

  it('handles large numbers', () => {
    const headers = getRateLimitHeaders(1000000, 999999, 9999999999)

    expect(headers['X-RateLimit-Limit']).toBe('1000000')
    expect(headers['X-RateLimit-Remaining']).toBe('999999')
    expect(headers['X-RateLimit-Reset']).toBe('9999999999')
  })

  it('returns headers with correct header names', () => {
    const headers = getRateLimitHeaders(10, 5, 1000)

    expect(Object.keys(headers)).toEqual([
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ])
  })
})

describe('MemoryLimiter', () => {
  it('allows up to max requests per identifier, then blocks', async () => {
    const limiter = new MemoryLimiter(2, 60_000)
    expect((await limiter.limit('a')).success).toBe(true)
    const second = await limiter.limit('a')
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(0)
    expect((await limiter.limit('a')).success).toBe(false)
    expect((await limiter.limit('b')).success).toBe(true)
  })

  it('resets after the window passes', async () => {
    vi.useFakeTimers()
    try {
      const limiter = new MemoryLimiter(1, 1_000)
      expect((await limiter.limit('a')).success).toBe(true)
      expect((await limiter.limit('a')).success).toBe(false)
      vi.advanceTimersByTime(1_001)
      expect((await limiter.limit('a')).success).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('works through checkRateLimit', async () => {
    const limiter = new MemoryLimiter(1, 60_000)
    expect((await checkRateLimit(limiter, 'x')).success).toBe(true)
    const blocked = await checkRateLimit(limiter, 'x')
    expect(blocked).toMatchObject({ success: false, limit: 1, remaining: 0 })
  })
})
