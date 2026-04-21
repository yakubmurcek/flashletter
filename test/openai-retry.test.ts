import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, extractRateLimitInfo } from '@/lib/utils/openai-retry'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync()
    return promise
  }

  it('returns the result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on 429 and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce('eventual-ok')

    const promise = retryWithBackoff(fn, { initialDelay: 10, maxRetries: 3 })
    const result = await runWithTimers(promise)

    expect(result).toBe('eventual-ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('retries on 500-class errors', async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce('ok')
    const promise = retryWithBackoff(fn, { initialDelay: 10 })
    const result = await runWithTimers(promise)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)', async () => {
    const fn = vi.fn().mockRejectedValueOnce({ code: 'ECONNRESET' }).mockResolvedValueOnce('ok')
    const promise = retryWithBackoff(fn, { initialDelay: 10 })
    const result = await runWithTimers(promise)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does NOT retry non-retryable errors (400)', async () => {
    const err = { status: 400, message: 'bad request' }
    const fn = vi.fn().mockRejectedValue(err)
    await expect(retryWithBackoff(fn, { initialDelay: 10 })).rejects.toEqual(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry generic errors without status or code', async () => {
    const err = new Error('random failure')
    const fn = vi.fn().mockRejectedValue(err)
    await expect(retryWithBackoff(fn, { initialDelay: 10 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('stops after maxRetries and throws the last error', async () => {
    const err = { status: 500 }
    const fn = vi.fn().mockRejectedValue(err)
    const promise = retryWithBackoff(fn, { initialDelay: 10, maxRetries: 2 })
    // Attach handler immediately to avoid unhandled-rejection warning from fake timers
    const caught = promise.catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    expect(await caught).toEqual(err)
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })
})

describe('extractRateLimitInfo', () => {
  it('extracts limit/remaining/reset from headers', () => {
    const info = extractRateLimitInfo({
      headers: {
        'x-ratelimit-limit-requests': '100',
        'x-ratelimit-remaining-requests': '42',
        'x-ratelimit-reset-requests': '30',
      },
    })
    expect(info).toEqual({ limit: 100, remaining: 42, resetTime: 30 })
  })

  it('returns empty object for errors without headers', () => {
    expect(extractRateLimitInfo({ status: 429 })).toEqual({})
  })

  it('returns empty object for null/non-object', () => {
    expect(extractRateLimitInfo(null)).toEqual({})
    expect(extractRateLimitInfo('err')).toEqual({})
  })

  it('returns partial info when some headers are missing', () => {
    const info = extractRateLimitInfo({
      headers: { 'x-ratelimit-limit-requests': '10' },
    })
    expect(info.limit).toBe(10)
    expect(info.remaining).toBeUndefined()
    expect(info.resetTime).toBeUndefined()
  })
})
