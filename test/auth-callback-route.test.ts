import { describe, it, expect, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

const exchangeCodeForSession = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}))

import { GET } from '@/app/auth/callback/route'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'

async function redirectFor(redirectTo: string) {
  const url = new URL('https://flashletter.app/auth/callback')
  url.searchParams.set('code', 'abc')
  url.searchParams.set('redirectTo', redirectTo)
  const res = await GET(new Request(url))
  return new URL(res.headers.get('location')!)
}

describe('GET /auth/callback redirectTo', () => {
  it('returns to a same-site path', async () => {
    const location = await redirectFor('/account?upgrade=month')
    expect(location.origin).toBe('https://flashletter.app')
    expect(location.pathname + location.search).toBe('/account?upgrade=month')
  })

  it.each(['//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example'])(
    'never leaves the site for %j',
    async (payload) => {
      const location = await redirectFor(payload)
      expect(location.origin).toBe('https://flashletter.app')
      expect(location.pathname).toBe('/campaigns')
    },
  )
})

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeRedirectPath('/create/editor?campaign=1#top')).toBe('/create/editor?campaign=1#top')
  })

  it.each([
    null,
    undefined,
    '',
    'https://evil.example',
    'evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/\r\n/evil.example',
    ['/campaigns'],
  ])('falls back for %j', (payload) => {
    expect(safeRedirectPath(payload, '/fallback')).toBe('/fallback')
  })
})
