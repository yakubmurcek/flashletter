import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Email } from '@/lib/types'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}) as unknown,
}))

const saveVersionMock = vi.fn()
vi.mock('@/lib/services/email-version-storage.service', () => ({
  EmailVersionStorageService: vi.fn().mockImplementation(() => ({
    saveVersion: saveVersionMock,
  })),
}))

const updateEmailDbMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  CampaignStorageService: vi.fn().mockImplementation(() => ({
    updateEmail: updateEmailDbMock,
  })),
}))

import { useEmailAutosave } from '@/lib/hooks/use-email-autosave'
import { EMAIL_SAVE_DEBOUNCE_MS } from '@/lib/constants/app'

const makeEmail = (id: number, uuid: string | null = `uuid-${id}`): Email =>
  ({
    id,
    uuid,
    day: id,
    subject: `S${id}`,
    preview: `P${id}`,
    content: `C${id}`,
  }) as Email

describe('useEmailAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    saveVersionMock.mockReset().mockResolvedValue({})
    updateEmailDbMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('initializes clean', () => {
    const { result } = renderHook(() => useEmailAutosave([], null, vi.fn()))
    expect(result.current.isSaving).toBe(false)
    expect(result.current.lastSaved).toBeNull()
  })

  it('saves a version BEFORE updating local state when versioning is enabled', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]

    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'New' })
    })

    expect(saveVersionMock).toHaveBeenCalledWith('uuid-1', 1, {
      subject: 'S1',
      content: 'C1',
    })
    expect(updateEmail).toHaveBeenCalledWith(1, { subject: 'New' })
  })

  it('skips versioning when skipVersioning=true', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' }, true)
    })
    expect(saveVersionMock).not.toHaveBeenCalled()
    expect(updateEmail).toHaveBeenCalledWith(1, { subject: 'X' })
  })

  it('does NOT call DB update when no campaign id', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, null, updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    await act(async () => {
      vi.advanceTimersByTime(EMAIL_SAVE_DEBOUNCE_MS + 100)
    })
    expect(updateEmailDbMock).not.toHaveBeenCalled()
  })

  it('debounces DB writes — multiple saves within window collapse to one', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result, rerender } = renderHook(
      ({ list }: { list: Email[] }) => useEmailAutosave(list, 'camp', updateEmail),
      { initialProps: { list: emails } },
    )

    // Three rapid saves — only the last should hit the DB after debounce
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'A' })
    })
    rerender({ list: [{ ...emails[0], subject: 'A' } as Email] })
    await act(async () => {
      vi.advanceTimersByTime(200)
      await result.current.saveEmail(1, { subject: 'B' })
    })
    rerender({ list: [{ ...emails[0], subject: 'B' } as Email] })
    await act(async () => {
      vi.advanceTimersByTime(200)
      await result.current.saveEmail(1, { subject: 'C' })
    })
    rerender({ list: [{ ...emails[0], subject: 'C' } as Email] })

    // Before debounce elapses
    expect(updateEmailDbMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    expect(updateEmailDbMock).toHaveBeenCalledTimes(1)
    // The persisted payload reads from emailsRef (latest array) — subject should be 'C'
    expect(updateEmailDbMock).toHaveBeenCalledWith('camp', 1, {
      subject: 'C',
      content: 'C1',
      preview: 'P1',
    })
  })

  it('sets lastSaved after successful DB write', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    expect(result.current.lastSaved).toBeInstanceOf(Date)
  })

  it('continues update flow even if version save fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    saveVersionMock.mockRejectedValue(new Error('version err'))
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    expect(updateEmail).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('skips versioning when email lacks a uuid', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const updateEmail = vi.fn()
    const emails = [makeEmail(1, null)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    expect(saveVersionMock).not.toHaveBeenCalled()
    expect(updateEmail).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('cleanup() clears pending debounced write', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    act(() => {
      result.current.cleanup()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 100)
    })
    expect(updateEmailDbMock).not.toHaveBeenCalled()
  })

  it('unmounting cancels pending debounced write', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result, unmount } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 100)
    })
    expect(updateEmailDbMock).not.toHaveBeenCalled()
  })

  it('swallows DB errors and resets isSaving', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    updateEmailDbMock.mockRejectedValue(new Error('db err'))
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })
    expect(result.current.isSaving).toBe(false)
    expect(result.current.lastSaved).toBeNull()
    errSpy.mockRestore()
  })
})
