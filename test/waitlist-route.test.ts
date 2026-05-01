import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'waitlist-1',
              email: 'test@example.com',
              order: 1,
            },
          }),
        }),
      }),
      delete: () => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: () => ({
        eq: () => ({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'waitlist-1', email: 'test@example.com' }],
          }),
        }),
      }),
    }),
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
    vi.restoreAllMocks()
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
    const supabaseMod = await import('@/lib/supabase/server')
    const spy = vi.spyOn(supabaseMod, 'createClient').mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'waitlist-1' },
            }),
          }),
        }),
      }),
    } as never)

    try {
      const response = await POST_WAITLIST(
        buildWaitlistRequest({ email: 'test@example.com' }) as never,
      )
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.message).toContain('Successfully joined')
      expect(body.alreadyJoined).toBe(true)
    } finally {
      spy.mockRestore()
    }
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
    vi.restoreAllMocks()
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
      buildUnsubscribeRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(200)
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
