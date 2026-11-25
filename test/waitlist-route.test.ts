import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// The waitlist table is closed to client roles (supabase/migrations/20261125133200_sync_live_drift.sql);
// the routes must go through the SECURITY DEFINER functions, never the table.
const rpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => {
      throw new Error('waitlist routes must not query the table directly')
    },
  }),
}))

import { POST as POST_WAITLIST } from '@/app/api/waitlist/route'
import { POST as POST_UNSUBSCRIBE } from '@/app/api/waitlist/unsubscribe/route'

function buildWaitlistRequest(body: unknown): Request {
  return new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function buildUnsubscribeRequest(body: unknown): Request {
  return new Request('http://localhost/api/waitlist/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({
      data: { id: 'waitlist-1', order: 1, total_count: 1, already_joined: false },
      error: null,
    })
  })

  it('returns 400 for invalid email format', async () => {
    const response = await POST_WAITLIST(buildWaitlistRequest({ email: 'not-an-email' }) as never)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when email is missing', async () => {
    const response = await POST_WAITLIST(buildWaitlistRequest({ name: 'John' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 200 (not 400) when email already exists — anti-enumeration', async () => {
    // Audit fix #9: signups for already-listed addresses must not leak
    // existence via a 400. Same shape as a successful signup.
    rpc.mockResolvedValueOnce({ data: { id: 'waitlist-1', already_joined: true }, error: null })
    const response = await POST_WAITLIST(
      buildWaitlistRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toContain('Successfully joined')
    expect(body.alreadyJoined).toBe(true)
  })

  it('successfully adds new email to waitlist', async () => {
    const response = await POST_WAITLIST(
      buildWaitlistRequest({
        email: 'new@example.com',
        name: 'John Doe',
        privacyConsent: true,
      }) as never,
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.message).toContain('Successfully joined')
    expect(body.id).toBeDefined()
    expect(rpc).toHaveBeenCalledWith('waitlist_join', {
      p_email: 'new@example.com',
      p_name: 'John Doe',
      p_privacy_consent: true,
      p_marketing_consent: false,
      p_consent_timestamp: null,
      p_user_region: 'OTHER',
    })
  })

  it('returns 500 when the database refuses the signup', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    const response = await POST_WAITLIST(buildWaitlistRequest({ email: 'x@example.com' }) as never)
    expect(response.status).toBe(500)
  })

  it('applies default values for optional fields', async () => {
    const response = await POST_WAITLIST(
      buildWaitlistRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(201)
  })
})

describe('POST /api/waitlist/unsubscribe', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: null, error: null })
  })

  it('returns 400 when neither email nor token is provided', async () => {
    const response = await POST_UNSUBSCRIBE(buildUnsubscribeRequest({}) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid email format', async () => {
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'not-email' }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('returns 200 for unknown email — anti-enumeration', async () => {
    // Audit fix #9: never reveal whether the address was on the list.
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'notfound@example.com' }) as never,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    // Uniform success shape — no `email` field, no membership leak.
    expect(body.email).toBeUndefined()
    expect(body.message).toBeDefined()
  })

  it('returns 200 for a known email and uses uniform success shape', async () => {
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'Test@Example.com' }) as never,
    )
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('waitlist_unsubscribe', { p_email: 'test@example.com' })
    const body = await response.json()
    expect(body.email).toBeUndefined()
    expect(body.message).toBeDefined()
  })

  it('returns 200 for an invalid token without surfacing the failure', async () => {
    // Audit fix #10: an invalid/expired token responds the same as success
    // so callers can't probe which tokens were ever valid.
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ token: 'totally-malformed-token' }) as never,
    )
    expect(response.status).toBe(200)
  })
})

describe('waitlist rate limits', () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({
      data: { id: 'waitlist-1', order: 1, total_count: 1, already_joined: false },
      error: null,
    })
  })

  const fromIp = (path: string, ip: string, body: unknown) =>
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
      body: JSON.stringify(body),
    })

  it('refuses a bot flooding the signup form from one address, not other visitors', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      const res = await POST_WAITLIST(
        fromIp('/api/waitlist', '203.0.113.7', { email: `bot${i}@example.com` }) as never,
      )
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 10).every((s) => s < 300)).toBe(true)
    expect(statuses[10]).toBe(429)
    const other = await POST_WAITLIST(
      fromIp('/api/waitlist', '198.51.100.4', { email: 'person@example.com' }) as never,
    )
    expect(other.status).toBeLessThan(300)
  })

  it('refuses mass unsubscribes from one address', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      const res = await POST_UNSUBSCRIBE(
        fromIp('/api/waitlist/unsubscribe', '203.0.113.8', { email: `a${i}@example.com` }) as never,
      )
      statuses.push(res.status)
    }
    expect(statuses[10]).toBe(429)
  })
})
