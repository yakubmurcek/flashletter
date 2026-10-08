import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnonymousLimit } from '@/lib/hooks/use-anonymous-limit'

// Mock createClient
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

// Import after mocks
import { createClient } from '@/lib/supabase/client'

describe('useAnonymousLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with loading state', () => {
    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    expect(result.current.isLoading).toBe(true)
  })

  it('handles no user - returns loading false and canCreate true', async () => {
    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAnonymous).toBe(false)
    expect(result.current.campaignCount).toBe(0)
    expect(result.current.canCreate).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('handles authenticated user - returns canCreate true with no limit check', async () => {
    const authenticatedUser = {
      id: 'user-123',
      is_anonymous: false,
      email: 'user@example.com',
    }

    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: authenticatedUser } }) },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAnonymous).toBe(false)
    expect(result.current.canCreate).toBe(true)
    expect(result.current.campaignCount).toBe(0)
    expect(result.current.user).toEqual(authenticatedUser)
  })

  it('handles anonymous user with count < limit', async () => {
    const anonymousUser = {
      id: 'anon-user-123',
      is_anonymous: true,
    }

    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: anonymousUser } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      })),
    }

    mockClient.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    }))

    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAnonymous).toBe(true)
    expect(result.current.campaignCount).toBe(0)
    expect(result.current.canCreate).toBe(true)
  })

  it('handles anonymous user at campaign limit', async () => {
    const anonymousUser = {
      id: 'anon-user-123',
      is_anonymous: true,
    }

    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: anonymousUser } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      })),
    }

    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAnonymous).toBe(true)
    expect(result.current.campaignCount).toBe(1)
    expect(result.current.canCreate).toBe(false)
  })

  it('handles supabase query error gracefully', async () => {
    const anonymousUser = {
      id: 'anon-user-123',
      is_anonymous: true,
    }

    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: anonymousUser } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Query failed') }),
      })),
    }

    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAnonymous).toBe(true)
    expect(result.current.campaignCount).toBe(0)
    expect(result.current.canCreate).toBe(true) // Error allows creation
  })

  it('handles null count response', async () => {
    const anonymousUser = {
      id: 'anon-user-123',
      is_anonymous: true,
    }

    const mockClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: anonymousUser } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: null }),
      })),
    }

    vi.mocked(createClient).mockReturnValue(mockClient as any)

    const { result } = renderHook(() => useAnonymousLimit())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.campaignCount).toBe(0)
    expect(result.current.canCreate).toBe(true)
  })
})
