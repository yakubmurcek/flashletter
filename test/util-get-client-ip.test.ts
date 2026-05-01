import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/utils/get-client-ip'
import { NextRequest } from 'next/server'

describe('getClientIp', () => {
  function createMockRequest(headers: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost:3000', { headers })
  }

  it('extracts a single x-forwarded-for entry', () => {
    const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('takes the LAST x-forwarded-for entry (the one set by the trusted proxy)', () => {
    // The leftmost entry is client-controlled on Vercel/Cloudflare; the real
    // IP is always the rightmost. Auditing finding #6 was about taking [0].
    const req = createMockRequest({
      'x-forwarded-for': 'attacker-spoof, 192.168.1.2, 203.0.113.5',
    })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('trims whitespace around x-forwarded-for entries', () => {
    const req = createMockRequest({ 'x-forwarded-for': '  192.168.1.1  ' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    // Cloudflare sets cf-connecting-ip directly from the connecting client and
    // it cannot be forged when fronted by CF — trust it before XFF.
    const req = createMockRequest({
      'x-forwarded-for': 'attacker-spoof, 203.0.113.5',
      'cf-connecting-ip': '198.51.100.7',
    })
    expect(getClientIp(req)).toBe('198.51.100.7')
  })

  it('uses cf-connecting-ip when x-forwarded-for is absent', () => {
    const req = createMockRequest({ 'cf-connecting-ip': '10.0.0.1' })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('prefers cf-connecting-ip over x-real-ip', () => {
    const req = createMockRequest({
      'cf-connecting-ip': '10.0.0.1',
      'x-real-ip': '172.16.0.1',
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('uses x-real-ip when neither cf-connecting-ip nor xff is present', () => {
    const req = createMockRequest({ 'x-real-ip': '172.16.0.1' })
    expect(getClientIp(req)).toBe('172.16.0.1')
  })

  it('prefers x-real-ip over x-forwarded-for', () => {
    const req = createMockRequest({
      'x-real-ip': '172.16.0.1',
      'x-forwarded-for': 'attacker-spoof, 203.0.113.5',
    })
    expect(getClientIp(req)).toBe('172.16.0.1')
  })

  it('returns anonymous when no headers are present', () => {
    const req = createMockRequest({})
    expect(getClientIp(req)).toBe('anonymous')
  })

  it('returns anonymous when x-forwarded-for is empty', () => {
    const req = createMockRequest({ 'x-forwarded-for': '' })
    expect(getClientIp(req)).toBe('anonymous')
  })

  it('handles IPv6 addresses', () => {
    const req = createMockRequest({ 'x-forwarded-for': '2001:db8::1' })
    expect(getClientIp(req)).toBe('2001:db8::1')
  })

  it('header lookup is case-insensitive', () => {
    const req = createMockRequest({ 'X-FORWARDED-FOR': '192.168.1.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('skips empty entries inside a malformed x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1,  ,192.168.1.2',
    })
    expect(getClientIp(req)).toBe('192.168.1.2')
  })
})
