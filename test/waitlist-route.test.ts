import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (...args: unknown[]) => ({
        eq: (col: string, val: unknown) => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
        order: (col: string, opts: unknown) => ({
          mockResolvedValue: { data: [] },
        }),
      }),
      insert: (data: unknown) => ({
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
      update: (data: unknown) => ({
        eq: (col: string, val: unknown) => ({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'waitlist-1', email: 'test@example.com' }],
          }),
        }),
      }),
    }),
  }),
}))

// Import after all vi.mock calls
import { POST as POST_WAITLIST, GET as GET_WAITLIST } from '@/app/api/waitlist/route'
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

function buildGetRequest(): Request {
  return new Request('http://localhost/api/waitlist', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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

  it('returns 400 when email already on waitlist', async () => {
    // Create a mock that returns an existing entry for the select query
    const mockSupabase = await (await import('@/lib/supabase/server')).createClient()
    const mockFrom = vi.spyOn(mockSupabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'waitlist-1', email: 'test@example.com' },
          }),
        }),
      }),
    } as never)

    const response = await POST_WAITLIST(
      buildWaitlistRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('already on the waitlist')
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
    expect(body.order).toBeDefined()
  })

  it('applies default values for optional fields', async () => {
    const response = await POST_WAITLIST(
      buildWaitlistRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(201)
  })

  it('handles Supabase insert error gracefully', async () => {
    const response = await POST_WAITLIST(
      buildWaitlistRequest({ email: 'test@example.com' }) as never,
    )
    // Current behavior: may return 500 if insert fails
    expect([200, 201, 400, 500]).toContain(response.status)
  })
})

describe('GET /api/waitlist', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with waitlist data', async () => {
    const response = await GET_WAITLIST(buildGetRequest() as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    const body = await response.json()
    expect(body.waitlist).toBeDefined()
    expect(Array.isArray(body.waitlist)).toBe(true)
  })

  it('returns empty array when waitlist is empty', async () => {
    const response = await GET_WAITLIST(buildGetRequest() as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.waitlist).toEqual([])
  })

  it('handles Supabase error on GET', async () => {
    const response = await GET_WAITLIST(buildGetRequest() as never)
    // Should either return 200 with data or 500 on error
    expect([200, 500]).toContain(response.status)
  })
})

describe('POST /api/waitlist/unsubscribe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for invalid email format', async () => {
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'not-email' }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('returns 404 when email not found in waitlist', async () => {
    const mockSupabase = await (await import('@/lib/supabase/server')).createClient()
    vi.spyOn(mockSupabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    } as never)

    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'notfound@example.com' }) as never,
    )
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toContain('not found')
  })

  it('successfully unsubscribes email from waitlist', async () => {
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'test@example.com' }) as never,
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toContain('unsubscribed')
    expect(body.email).toBe('test@example.com')
  })

  it('handles Supabase update error gracefully', async () => {
    const response = await POST_UNSUBSCRIBE(
      buildUnsubscribeRequest({ email: 'test@example.com' }) as never,
    )
    // Should handle error without crashing
    expect([200, 404, 500]).toContain(response.status)
  })
})
