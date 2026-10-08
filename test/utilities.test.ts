import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isValidCampaignId,
  isValidEmailId,
  isValidUrl,
  isValidString,
} from '@/lib/utils/validation'
import { debounce } from '@/lib/utils/debounce'
import { getUserFriendlyMessage, logError, withErrorHandling } from '@/lib/utils/error-handling'

describe('isValidCampaignId (UUID v4)', () => {
  it('accepts a valid UUID v4', () => {
    expect(isValidCampaignId('12345678-1234-4123-8123-123456789012')).toBe(true)
  })

  it('rejects non-v4 UUIDs', () => {
    expect(isValidCampaignId('12345678-1234-1123-8123-123456789012')).toBe(false)
  })

  it('rejects random strings', () => {
    expect(isValidCampaignId('not-a-uuid')).toBe(false)
    expect(isValidCampaignId('')).toBe(false)
  })

  it('accepts uppercase v4', () => {
    expect(isValidCampaignId('ABCDEF12-1234-4123-8123-ABCDEF123456')).toBe(true)
  })
})

describe('isValidEmailId', () => {
  it('accepts valid integer', () => {
    expect(isValidEmailId(1)).toBe(true)
    expect(isValidEmailId(365)).toBe(true)
  })

  it('accepts numeric string', () => {
    expect(isValidEmailId('42')).toBe(true)
  })

  it('rejects zero and negative', () => {
    expect(isValidEmailId(0)).toBe(false)
    expect(isValidEmailId(-5)).toBe(false)
  })

  it('rejects above limit (366)', () => {
    expect(isValidEmailId(366)).toBe(false)
  })

  it('rejects non-numeric string', () => {
    expect(isValidEmailId('forty-two')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('accepts https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts http URL', () => {
    expect(isValidUrl('http://example.com/path?q=1')).toBe(true)
  })

  it('rejects plain string', () => {
    expect(isValidUrl('example.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })
})

describe('isValidString', () => {
  it('accepts normal string', () => {
    expect(isValidString('hello')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidString('')).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(isValidString('   ')).toBe(false)
  })

  it('rejects above maxLength', () => {
    expect(isValidString('x'.repeat(1001))).toBe(false)
  })

  it('respects custom maxLength', () => {
    expect(isValidString('hello', 3)).toBe(false)
    expect(isValidString('hi', 3)).toBe(true)
  })
})

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('calls function after delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('collapses multiple rapid calls into one', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('cancel() prevents pending call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it('allows new calls after cancel', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced.cancel()
    debounced('b')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('b')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('getUserFriendlyMessage', () => {
  it('returns cancelled message for AbortError', () => {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    expect(getUserFriendlyMessage(err, 'foo')).toBe('Operation was cancelled')
  })

  it('returns network error for fetch failures', () => {
    expect(getUserFriendlyMessage(new Error('Failed to fetch'), 'foo')).toMatch(/network error/i)
  })

  it('returns permission message for unauthorized errors', () => {
    expect(getUserFriendlyMessage(new Error('unauthorized'), 'foo')).toMatch(/permission/i)
  })

  it('returns config message for API key errors', () => {
    expect(getUserFriendlyMessage(new Error('Invalid API key'), 'foo')).toMatch(/configuration/i)
  })

  it('falls back to generic for unknown errors instead of leaking the raw message', () => {
    expect(getUserFriendlyMessage(new Error('specific failure'), 'foo')).toBe(
      'Failed to foo. Please try again.',
    )
  })

  it('returns fallback for non-Error values', () => {
    expect(getUserFriendlyMessage('weird string', 'scrape')).toMatch(/failed to scrape/i)
  })
})

describe('withErrorHandling', () => {
  it('returns the result on success', async () => {
    const result = await withErrorHandling(async () => 42, { operation: 'test' })
    expect(result).toBe(42)
  })

  it('returns null and swallows errors', async () => {
    const result = await withErrorHandling(
      async () => {
        throw new Error('boom')
      },
      { operation: 'test' },
    )
    expect(result).toBeNull()
  })
})

describe('logError', () => {
  it('does not throw for Error input', () => {
    expect(() => logError(new Error('test'), { operation: 'x' })).not.toThrow()
  })

  it('does not throw for unknown input', () => {
    expect(() => logError({ weird: 'obj' }, { operation: 'x' })).not.toThrow()
  })
})
