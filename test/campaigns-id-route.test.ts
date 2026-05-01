import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const getCampaignMock = vi.fn()
const deleteCampaignMock = vi.fn()
const isOwnedByMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  // The constructor must always return the same shape, so don't use
  // `mockImplementation` here — `vi.restoreAllMocks()` between tests resets
  // it. A plain class wrapper survives all clears.
  CampaignStorageService: class {
    getCampaign = (...args: unknown[]) => getCampaignMock(...args)
    deleteCampaign = (...args: unknown[]) => deleteCampaignMock(...args)
    isOwnedBy = (...args: unknown[]) => isOwnedByMock(...args)
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Import after all vi.mock calls
import { DELETE } from '@/app/api/campaigns/[id]/route'

function buildRequest(): Request {
  return new Request('http://localhost/api/campaigns/123', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('DELETE /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getCampaignMock.mockReset()
    deleteCampaignMock.mockReset()
  })

  it('returns 401 when user is not authenticated', async () => {
    // The route called `createClient()` then `supabase.auth.getUser()`. The
    // top-level vi.mock returns user-123 by default; for this case we need
    // null. vi.doMock won't help because the route module already imported
    // createClient — instead, swap the export's implementation in place.
    const supabaseMod = await import('@/lib/supabase/server')
    const spy = vi.spyOn(supabaseMod, 'createClient').mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never)

    try {
      const response = await DELETE(buildRequest() as never, {
        params: Promise.resolve({ id: '123' }),
      })
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Unauthorized')
    } finally {
      spy.mockRestore()
    }
  })

  it('returns 404 when campaign not found', async () => {
    getCampaignMock.mockResolvedValue(null)

    const response = await DELETE(buildRequest() as never, {
      params: Promise.resolve({ id: '123' }),
    })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toContain('Campaign not found')
  })

  it('returns 403 when campaign belongs to different user', async () => {
    getCampaignMock.mockResolvedValue({
      id: '123',
      user_id: 'different-user-id',
    })

    const response = await DELETE(buildRequest() as never, {
      params: Promise.resolve({ id: '123' }),
    })
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Forbidden')
  })

  it('deletes campaign successfully and returns 200', async () => {
    getCampaignMock.mockResolvedValue({
      id: '123',
      user_id: 'user-123',
    })
    deleteCampaignMock.mockResolvedValue(true)

    const response = await DELETE(buildRequest() as never, {
      params: Promise.resolve({ id: '123' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(deleteCampaignMock).toHaveBeenCalledWith('123')
  })

  it('returns 500 when deletion fails', async () => {
    getCampaignMock.mockResolvedValue({
      id: '123',
      user_id: 'user-123',
    })
    deleteCampaignMock.mockRejectedValue(new Error('Database error'))

    const response = await DELETE(buildRequest() as never, {
      params: Promise.resolve({ id: '123' }),
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toContain('Failed to delete campaign')
  })
})
