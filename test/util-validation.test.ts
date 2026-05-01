import { describe, it, expect } from 'vitest'
import {
  isValidCampaignId,
  isValidEmailId,
  isValidUrl,
  isValidString,
} from '@/lib/utils/validation'

describe('isValidCampaignId', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidCampaignId('12345678-1234-4123-8123-123456789012')).toBe(true)
  })

  it('accepts uppercase UUID v4', () => {
    expect(isValidCampaignId('ABCDEF12-1234-4123-8123-ABCDEF123456')).toBe(true)
  })

  it('accepts mixed case UUID v4', () => {
    expect(isValidCampaignId('AbCdEf12-1234-4123-8123-aBcDeF123456')).toBe(true)
  })

  it('rejects non-v4 UUIDs (v1)', () => {
    expect(isValidCampaignId('12345678-1234-1123-8123-123456789012')).toBe(false)
  })

  it('rejects non-v4 UUIDs (v3)', () => {
    expect(isValidCampaignId('12345678-1234-3123-8123-123456789012')).toBe(false)
  })

  it('rejects malformed UUID', () => {
    expect(isValidCampaignId('not-a-uuid')).toBe(false)
    expect(isValidCampaignId('123456789012')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidCampaignId('')).toBe(false)
  })

  it('rejects UUID with wrong version digit', () => {
    expect(isValidCampaignId('12345678-1234-5123-8123-123456789012')).toBe(false)
  })

  it('rejects UUID with invalid variant', () => {
    expect(isValidCampaignId('12345678-1234-4123-0123-123456789012')).toBe(false)
  })
})

describe('isValidEmailId', () => {
  it('accepts email ID 1', () => {
    expect(isValidEmailId(1)).toBe(true)
  })

  it('accepts email ID 365', () => {
    expect(isValidEmailId(365)).toBe(true)
  })

  it('accepts string number', () => {
    expect(isValidEmailId('42')).toBe(true)
  })

  it('accepts middle values', () => {
    expect(isValidEmailId(100)).toBe(true)
    expect(isValidEmailId(180)).toBe(true)
  })

  it('rejects 0', () => {
    expect(isValidEmailId(0)).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(isValidEmailId(-1)).toBe(false)
    expect(isValidEmailId(-100)).toBe(false)
  })

  it('rejects 366', () => {
    expect(isValidEmailId(366)).toBe(false)
  })

  it('rejects above limit', () => {
    expect(isValidEmailId(1000)).toBe(false)
  })

  it('rejects non-numeric string', () => {
    expect(isValidEmailId('forty-two')).toBe(false)
  })

  it('accepts float (parsed as int via parseInt)', () => {
    // Source uses parseInt(id, 10) which returns 3 for 3.5; 3 is in range
    expect(isValidEmailId(3.5)).toBe(true)
  })

  it('accepts string with leading numeric characters (parseInt extracts prefix)', () => {
    // parseInt('42x', 10) → 42 which is valid
    expect(isValidEmailId('42x')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidEmailId('')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('accepts https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('accepts URL with path', () => {
    expect(isValidUrl('https://example.com/path/to/page')).toBe(true)
  })

  it('accepts URL with query params', () => {
    expect(isValidUrl('https://example.com/path?q=1&page=2')).toBe(true)
  })

  it('accepts URL with hash', () => {
    expect(isValidUrl('https://example.com#section')).toBe(true)
  })

  it('accepts URL with port', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true)
  })

  it('rejects plain domain without protocol', () => {
    expect(isValidUrl('example.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('accepts ftp URL (URL constructor accepts any valid protocol)', () => {
    // Source uses new URL() which accepts ftp; no protocol allowlist
    expect(isValidUrl('ftp://example.com')).toBe(true)
  })

  it('rejects malformed URL', () => {
    expect(isValidUrl('https://')).toBe(false)
  })

  it('rejects relative URLs', () => {
    expect(isValidUrl('/path/to/page')).toBe(false)
  })

  it('accepts file protocol', () => {
    expect(isValidUrl('file:///path/to/file')).toBe(true)
  })
})

describe('isValidString', () => {
  it('accepts normal string', () => {
    expect(isValidString('hello')).toBe(true)
  })

  it('accepts string with numbers', () => {
    expect(isValidString('hello123')).toBe(true)
  })

  it('accepts string with special characters', () => {
    expect(isValidString('hello-world_123!')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidString('')).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(isValidString('   ')).toBe(false)
  })

  it('rejects string exceeding maxLength', () => {
    expect(isValidString('x'.repeat(1001))).toBe(false)
  })

  it('accepts string at maxLength boundary', () => {
    expect(isValidString('x'.repeat(1000))).toBe(true)
  })

  it('respects custom maxLength', () => {
    expect(isValidString('hello', 3)).toBe(false)
    expect(isValidString('hi', 3)).toBe(true)
    expect(isValidString('abc', 3)).toBe(true)
  })

  it('accepts single character', () => {
    expect(isValidString('a')).toBe(true)
  })

  it('rejects null/undefined', () => {
    expect(isValidString(null as any)).toBe(false)
    expect(isValidString(undefined as any)).toBe(false)
  })

  it('trims whitespace before validation', () => {
    expect(isValidString('  hello  ')).toBe(true)
  })
})
