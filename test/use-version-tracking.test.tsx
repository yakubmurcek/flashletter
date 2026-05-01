import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { Email } from '@/lib/types'

// Mock supabase client (instance is irrelevant — service is mocked).
// Return the SAME object on every call so the hook's useMemo on the supabase
// reference stays stable; otherwise the effect re-fires every render and we
// see an infinite refetch loop.
const stableClient = {} as unknown
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => stableClient,
}))

// Mock the EmailVersionStorageService class — capture instances so we can assert
const getBatchVersionCountsMock = vi.fn()
const getVersionCountMock = vi.fn()
vi.mock('@/lib/services/email-version-storage.service', () => ({
  // Class wrapper survives vi.clearAllMocks() (which would otherwise wipe the
  // implementation off the constructor and leave callers with `undefined`).
  EmailVersionStorageService: class {
    getBatchVersionCounts = (...args: unknown[]) => getBatchVersionCountsMock(...args)
    getVersionCount = (...args: unknown[]) => getVersionCountMock(...args)
  },
}))

import { useVersionTracking } from '@/lib/hooks/use-version-tracking'

const makeEmail = (id: number, uuid: string | null = `uuid-${id}`): Email =>
  ({
    id,
    uuid,
    day: id,
    subject: `Subject ${id}`,
    preview: `Preview ${id}`,
    content: `Content ${id}`,
  }) as Email

describe('useVersionTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBatchVersionCountsMock.mockReset().mockResolvedValue({})
    getVersionCountMock.mockReset().mockResolvedValue(0)
  })

  it('initializes with empty counts and not loading when emails is empty', () => {
    const { result } = renderHook(() => useVersionTracking([]))
    expect(result.current.versionCounts).toEqual({})
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches counts in a single batch (no N+1)', async () => {
    const emails = [makeEmail(1), makeEmail(2), makeEmail(3)]
    getBatchVersionCountsMock.mockResolvedValue({
      'uuid-1': 2,
      'uuid-2': 5,
      'uuid-3': 0,
    })

    const { result } = renderHook(() => useVersionTracking(emails))

    await waitFor(() => {
      expect(result.current.versionCounts).toEqual({ 1: 2, 2: 5, 3: 0 })
    })

    // Critical: only ONE batch call, not one per email
    expect(getBatchVersionCountsMock).toHaveBeenCalledTimes(1)
    expect(getBatchVersionCountsMock).toHaveBeenCalledWith(['uuid-1', 'uuid-2', 'uuid-3'])
    // The single-fetch method must NOT be called during initial load
    expect(getVersionCountMock).not.toHaveBeenCalled()
  })

  it('filters out emails missing a uuid before batching', async () => {
    const emails = [makeEmail(1), makeEmail(2, null), makeEmail(3)]
    getBatchVersionCountsMock.mockResolvedValue({ 'uuid-1': 1, 'uuid-3': 7 })

    const { result } = renderHook(() => useVersionTracking(emails))

    await waitFor(() => {
      expect(result.current.versionCounts[1]).toBe(1)
    })

    expect(getBatchVersionCountsMock).toHaveBeenCalledWith(['uuid-1', 'uuid-3'])
    // Email without uuid maps to 0
    expect(result.current.versionCounts[2]).toBe(0)
    expect(result.current.versionCounts[3]).toBe(7)
  })

  it('falls back to 0 for all emails on batch error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getBatchVersionCountsMock.mockRejectedValue(new Error('db down'))

    const emails = [makeEmail(1), makeEmail(2)]
    const { result } = renderHook(() => useVersionTracking(emails))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.versionCounts).toEqual({ 1: 0, 2: 0 })
    errSpy.mockRestore()
  })

  it('refreshVersionCount updates count for a single email', async () => {
    const emails = [makeEmail(1), makeEmail(2)]
    getBatchVersionCountsMock.mockResolvedValue({ 'uuid-1': 0, 'uuid-2': 0 })

    const { result } = renderHook(() => useVersionTracking(emails))
    await waitFor(() => expect(result.current.versionCounts[1]).toBe(0))

    getVersionCountMock.mockResolvedValue(4)
    await act(async () => {
      await result.current.refreshVersionCount(1)
    })

    expect(getVersionCountMock).toHaveBeenCalledWith('uuid-1')
    expect(result.current.versionCounts[1]).toBe(4)
    expect(result.current.versionCounts[2]).toBe(0) // unchanged
  })

  it('refreshVersionCount is a no-op for unknown emailId', async () => {
    const emails = [makeEmail(1)]
    getBatchVersionCountsMock.mockResolvedValue({ 'uuid-1': 0 })
    const { result } = renderHook(() => useVersionTracking(emails))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.refreshVersionCount(999)
    })
    expect(getVersionCountMock).not.toHaveBeenCalled()
  })

  it('restoreVersion fetches updated count for the restored email', async () => {
    const emails = [makeEmail(1)]
    getBatchVersionCountsMock.mockResolvedValue({ 'uuid-1': 1 })
    const { result } = renderHook(() => useVersionTracking(emails))
    await waitFor(() => expect(result.current.versionCounts[1]).toBe(1))

    getVersionCountMock.mockResolvedValue(3)
    await act(async () => {
      await result.current.restoreVersion({ emailId: 1, subject: 's', content: 'c' })
    })

    expect(getVersionCountMock).toHaveBeenCalledWith('uuid-1')
    expect(result.current.versionCounts[1]).toBe(3)
  })

  it('refreshVersionCount swallows errors without breaking state', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const emails = [makeEmail(1)]
    getBatchVersionCountsMock.mockResolvedValue({ 'uuid-1': 2 })
    const { result } = renderHook(() => useVersionTracking(emails))
    await waitFor(() => expect(result.current.versionCounts[1]).toBe(2))

    getVersionCountMock.mockRejectedValue(new Error('boom'))
    await act(async () => {
      await result.current.refreshVersionCount(1)
    })

    expect(result.current.versionCounts[1]).toBe(2) // unchanged on error
    errSpy.mockRestore()
  })

  it('toggles isLoading around the batch fetch', async () => {
    const emails = [makeEmail(1)]
    let resolveBatch: (value: Record<string, number>) => void = () => {}
    getBatchVersionCountsMock.mockReturnValue(
      new Promise<Record<string, number>>((res) => {
        resolveBatch = res
      }),
    )

    const { result } = renderHook(() => useVersionTracking(emails))
    await waitFor(() => expect(result.current.isLoading).toBe(true))

    await act(async () => {
      resolveBatch({ 'uuid-1': 0 })
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })
})
