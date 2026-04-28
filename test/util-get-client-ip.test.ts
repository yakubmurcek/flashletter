import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/utils/get-client-ip'
import type { NextRequest } from 'next/server'

describe('getClientIp', () => {
  function createMockRequest(headers: Record<string, string>): NextRequest {
    const req = new NextRequest('http://localhost:3000', {
      headers,
    })
    return req
  }

  it('extracts IP from x-forwarded-for header', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('extracts first IP from x-forwarded-for with multiple IPs', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1, 192.168.1.2, 192.168.1.3',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('trims whitespace from x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '  192.168.1.1  ',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('prefers x-forwarded-for over cf-connecting-ip', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'cf-connecting-ip': '10.0.0.1',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('uses cf-connecting-ip when x-forwarded-for not present', () => {
    const req = createMockRequest({
      'cf-connecting-ip': '10.0.0.1',
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('prefers cf-connecting-ip over x-real-ip', () => {
    const req = createMockRequest({
      'cf-connecting-ip': '10.0.0.1',
      'x-real-ip': '172.16.0.1',
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('uses x-real-ip when others not present', () => {
    const req = createMockRequest({
      'x-real-ip': '172.16.0.1',
    })
    expect(getClientIp(req)).toBe('172.16.0.1')
  })

  it('returns anonymous when no headers present', () => {
    const req = createMockRequest({})
    expect(getClientIp(req)).toBe('anonymous')
  })

  it('returns anonymous with empty x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '',
    })
    // Empty after split might yield empty string or anonymous depending on implementation
    const result = getClientIp(req)
    expect(result).toBe('anonymous')
  })

  it('handles IPv6 addresses', () => {
    const req = createMockRequest({
      'x-forwarded-for': '2001:db8::1',
    })
    expect(getClientIp(req)).toBe('2001:db8::1')
  })

  it('header lookup is case-insensitive', () => {
    // NextRequest.headers.get() is case-insensitive
    const req = createMockRequest({
      'X-FORWARDED-FOR': '192.168.1.1',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('handles malformed x-forwarded-for with extra spaces', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1,  ,192.168.1.2',
    })
    // First entry is 192.168.1.1
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('returns localhost for local requests', () => {
    const req = createMockRequest({
      'x-forwarded-for': 'localhost',
    })
    expect(getClientIp(req)).toBe('localhost')
  })
})
