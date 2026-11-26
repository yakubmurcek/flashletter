import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const userRateLimitMock = vi.fn()
const ipRateLimitMock = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  sendTestEmailRateLimit: { __tag: 'user' } as unknown,
  sendTestEmailIpRateLimit: { __tag: 'ip' } as unknown,
  // The route hands `sendTestEmailRateLimit` to checkRateLimit first, then
  // `sendTestEmailIpRateLimit` — branch on the limiter token to keep the two
  // limiters independently controllable from each test.
  checkRateLimit: (limiter: { __tag: string } | null) => {
    if (limiter?.__tag === 'user') return userRateLimitMock()
    if (limiter?.__tag === 'ip') return ipRateLimitMock()
    return Promise.resolve({ success: true, limit: 0, remaining: 0, reset: 0 })
  },
  getRateLimitHeaders: () => ({
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': '4',
    'X-RateLimit-Reset': '0',
  }),
}))

vi.mock('@/lib/utils/get-client-ip', () => ({
  getClientIp: () => '203.0.113.5',
}))

const isOwnedByMock = vi.fn()
const getEmailMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  // Class wrapper (not vi.fn().mockImplementation) so vi.restoreAllMocks()
  // in beforeEach can't strip the constructor between tests — same pattern
  // as test/generate-emails-route.test.ts.
  CampaignStorageService: class {
    isOwnedBy = (...args: unknown[]) => isOwnedByMock(...args)
    getEmail = (...args: unknown[]) => getEmailMock(...args)
  },
}))

const getUserMock = vi.fn()
const updateUserMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: () => getUserMock(),
      updateUser: (args: unknown) => updateUserMock(args),
    },
  }),
}))

const resendSendMock = vi.fn()
vi.mock('resend', () => ({
  // Class wrapper survives vi.restoreAllMocks() — same reason as
  // CampaignStorageService above.
  Resend: class {
    emails = { send: (args: unknown) => resendSendMock(args) }
  },
}))

import { POST } from '@/app/api/send-test-email/route'
import { at } from './_helpers/at'

const VALID_CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/send-test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { campaignId: VALID_CAMPAIGN_ID, emailDay: 1 }

describe('POST /api/send-test-email', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_ENABLE_TEST_SEND = 'true'
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_ADDRESS = 'test@flashletter.app'

    userRateLimitMock
      .mockReset()
      .mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 })
    ipRateLimitMock
      .mockReset()
      .mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0 })

    getUserMock.mockReset().mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'real@user.com', is_anonymous: false },
      },
    })
    updateUserMock.mockReset().mockResolvedValue({ error: null })

    isOwnedByMock.mockReset().mockResolvedValue(true)
    getEmailMock.mockReset().mockResolvedValue({
      id: 1,
      day: 1,
      subject: 'Welcome',
      preview: '',
      content: 'Hello **world**',
    })

    resendSendMock.mockReset().mockResolvedValue({ error: null })
  })

  it('returns 404 when test send is not enabled, before touching auth or Resend', async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_TEST_SEND

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(404)
    expect(getUserMock).not.toHaveBeenCalled()
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the flag is set to anything other than "true"', async () => {
    process.env.NEXT_PUBLIC_ENABLE_TEST_SEND = '1'

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(404)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(401)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 429 when the per-user rate limit is exceeded', async () => {
    userRateLimitMock.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 1234,
    })

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(429)
    expect(resendSendMock).not.toHaveBeenCalled()
    // Confirms we never even try the IP limiter once the user limiter has spoken.
    expect(ipRateLimitMock).not.toHaveBeenCalled()
  })

  it('returns 429 when the per-IP rate limit is exceeded', async () => {
    ipRateLimitMock.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: 1234,
    })

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(429)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 400 on a malformed body', async () => {
    const res = await POST(buildRequest({ campaignId: 'not-a-uuid', emailDay: 1 }) as never)
    expect(res.status).toBe(400)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 500 when Resend env vars are missing', async () => {
    delete process.env.RESEND_API_KEY

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(500)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the user does not own the campaign', async () => {
    isOwnedByMock.mockResolvedValue(false)

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(404)
    expect(getEmailMock).not.toHaveBeenCalled()
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the requested email day does not exist', async () => {
    getEmailMock.mockResolvedValue(null)

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(404)
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('authed user: sends to their account email and ignores recipientEmail', async () => {
    const res = await POST(
      buildRequest({ ...validBody, recipientEmail: 'phisher@evil.com' }) as never,
    )

    expect(res.status).toBe(200)
    expect(resendSendMock).toHaveBeenCalledTimes(1)
    const sendArgs = at(resendSendMock.mock.calls, 0)[0]
    expect(sendArgs.to).toBe('real@user.com')
    expect(sendArgs.from).toBe('test@flashletter.app')
    expect(sendArgs.subject).toBe('[Test] Welcome')
    expect(sendArgs.html).toContain('world')
    expect(sendArgs.text).toBe('Hello **world**')
    // Authed user upgrade flow must not fire.
    expect(updateUserMock).not.toHaveBeenCalled()

    const body = await res.json()
    expect(body).toEqual({ ok: true, sentTo: 'real@user.com', upgradeStarted: false })
  })

  it('guest with a recipientEmail: 401, no send, never converts the guest into an account', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'anon-1', email: undefined, is_anonymous: true } },
    })

    const res = await POST(buildRequest({ ...validBody, recipientEmail: 'new@user.com' }) as never)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Create a free account to send test emails.' })
    expect(resendSendMock).not.toHaveBeenCalled()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('guest without a recipientEmail: same 401', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'anon-1', email: undefined, is_anonymous: true } },
    })

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Create a free account to send test emails.' })
    expect(resendSendMock).not.toHaveBeenCalled()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('signed-in user without an account email: 400, no send', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: undefined, is_anonymous: false } },
    })

    const res = await POST(
      buildRequest({ ...validBody, recipientEmail: 'someone@else.com' }) as never,
    )

    expect(res.status).toBe(400)
    expect(resendSendMock).not.toHaveBeenCalled()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('returns 502 when Resend rejects the send', async () => {
    resendSendMock.mockResolvedValue({ error: { message: 'invalid from domain' } })

    const res = await POST(buildRequest(validBody) as never)

    expect(res.status).toBe(502)
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('checks ownership before reading the email row', async () => {
    isOwnedByMock.mockResolvedValue(false)

    await POST(buildRequest(validBody) as never)

    expect(isOwnedByMock).toHaveBeenCalledWith(VALID_CAMPAIGN_ID, 'user-123')
    expect(getEmailMock).not.toHaveBeenCalled()
  })
})
