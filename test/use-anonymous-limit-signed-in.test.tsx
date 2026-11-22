import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnonymousLimit } from '@/lib/hooks/use-anonymous-limit'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase/client'

function signedIn() {
  vi.mocked(createClient).mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', is_anonymous: false } } }),
    },
    from: vi.fn(),
  } as unknown as ReturnType<typeof createClient>)
}

function status(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }))
}

describe('useAnonymousLimit for signed-in users', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('blocks a free user who used this month’s campaigns', async () => {
    signedIn()
    status({ campaignsThisMonth: 3, limits: { campaignsPerMonth: 3 } })
    const { result } = renderHook(() => useAnonymousLimit())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.canCreate).toBe(false)
    expect(result.current.campaignLimit).toBe(3)
  })

  it('allows a free user under the limit', async () => {
    signedIn()
    status({ campaignsThisMonth: 1, limits: { campaignsPerMonth: 3 } })
    const { result } = renderHook(() => useAnonymousLimit())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.canCreate).toBe(true)
  })

  it('allows Pro (no monthly limit) and allows on a failed check', async () => {
    signedIn()
    status({ campaignsThisMonth: 40, limits: { campaignsPerMonth: null } })
    const pro = renderHook(() => useAnonymousLimit())
    await waitFor(() => expect(pro.result.current.isLoading).toBe(false))
    expect(pro.result.current.canCreate).toBe(true)

    status({}, false)
    const failed = renderHook(() => useAnonymousLimit())
    await waitFor(() => expect(failed.result.current.isLoading).toBe(false))
    expect(failed.result.current.canCreate).toBe(true)
  })
})
