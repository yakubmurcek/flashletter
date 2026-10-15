import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Email } from '@/lib/types'

// Stable supabase reference so the hook's useMemo over `supabase` doesn't
// invalidate every render and re-create the service instances.
const stableClient = {} as unknown
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => stableClient,
}))

const saveVersionMock = vi.fn()
vi.mock('@/lib/services/email-version-storage.service', () => ({
  // Class wrapper survives vi.restoreAllMocks(); a vi.fn().mockImplementation
  // gets stripped between tests.
  EmailVersionStorageService: class {
    saveVersion = (...args: unknown[]) => saveVersionMock(...args)
  },
}))

const updateEmailDbMock = vi.fn()
vi.mock('@/lib/services/campaign-storage.service', () => ({
  CampaignStorageService: class {
    updateEmail = (...args: unknown[]) => updateEmailDbMock(...args)
  },
}))

const trackMock = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
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
    trackMock.mockReset()
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

  it('saves a snapshot version inside the same debounce as the DB write', async () => {
    // Audit-fix: saveVersion is no longer fired synchronously from saveEmail;
    // it's deferred into the same setTimeout(EMAIL_SAVE_DEBOUNCE_MS) as the
    // DB write, and persists the *previous* snapshot (so the version row
    // captures the state the user was in BEFORE this typing burst). For
    // the snapshot diff to fire we need the emails array to actually reflect
    // the new subject when the timer runs (the hook reads emailsRef inside
    // setTimeout). So drive a re-render with the updated email.
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]

    const { result, rerender } = renderHook(
      ({ list }: { list: Email[] }) => useEmailAutosave(list, 'camp', updateEmail),
      { initialProps: { list: emails } },
    )
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'New' })
    })

    // Local update is sync; saveVersion + DB write are deferred.
    expect(updateEmail).toHaveBeenCalledWith(1, { subject: 'New' })
    expect(saveVersionMock).not.toHaveBeenCalled()

    // Simulate parent applying the update so emailsRef in the hook sees it.
    rerender({ list: [{ ...emails[0], subject: 'New' } as Email] })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    expect(saveVersionMock).toHaveBeenCalledWith('uuid-1', 1, {
      subject: 'S1',
      content: 'C1',
    })
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

  it('fires email_edited once per email id, even across multiple saves to the same id', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1), makeEmail(2)]
    const { result, rerender } = renderHook(
      ({ list }: { list: Email[] }) => useEmailAutosave(list, 'camp', updateEmail),
      { initialProps: { list: emails } },
    )

    // First save on email 1 — should fire once.
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'A' })
    })
    rerender({ list: [{ ...emails[0], subject: 'A' } as Email, emails[1]] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    // Second save on email 1 — must NOT fire again.
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'B' })
    })
    rerender({ list: [{ ...emails[0], subject: 'B' } as Email, emails[1]] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    // Save on email 2 — distinct id, must fire its own event.
    await act(async () => {
      await result.current.saveEmail(2, { subject: 'C' })
    })
    rerender({
      list: [{ ...emails[0], subject: 'B' } as Email, { ...emails[1], subject: 'C' } as Email],
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    const fired = trackMock.mock.calls.filter((c) => c[0] === 'email_edited')
    expect(fired).toHaveLength(2)
    expect(fired.map((c) => c[1])).toEqual([{ day: 1 }, { day: 2 }])
  })

  it('does not fire email_edited when skipVersioning=true (e.g. version restore)', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'restored' }, true)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    const fired = trackMock.mock.calls.filter((c) => c[0] === 'email_edited')
    expect(fired).toHaveLength(0)
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

  // Leaving the editor (History, All campaigns) inside the debounce window
  // used to drop the write, so the edit was gone after a reload.
  it('unmounting writes a pending edit right away instead of dropping it', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result, unmount } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'X' })
    })
    await act(async () => {
      unmount()
    })
    expect(updateEmailDbMock).toHaveBeenCalledTimes(1)
    expect(updateEmailDbMock.mock.calls[0][2]).toEqual(expect.objectContaining({ subject: 'X' }))
  })

  // The preview flushes its own pending edit while the page unmounts; that
  // write must carry the new text even though the page will not re-render.
  it('a save made during unmount still writes the new text', async () => {
    const updateEmail = vi.fn()
    const emails = [makeEmail(1)]
    const { result, unmount } = renderHook(() => useEmailAutosave(emails, 'camp', updateEmail))
    const { saveEmail } = result.current

    await act(async () => {
      unmount()
      await saveEmail(1, { subject: 'Late' })
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 100)
    })
    expect(updateEmailDbMock).toHaveBeenCalledTimes(1)
    expect(updateEmailDbMock.mock.calls[0][2]).toEqual(expect.objectContaining({ subject: 'Late' }))
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
  // Bug: day ids are 1..N in every campaign, so after switching campaigns
  // the version history baseline was the previous campaign's text.
  it('seeds version snapshots per campaign, not from the previous campaign', async () => {
    const updateEmail = vi.fn()
    const emailA = makeEmail(1)
    const emailB = { ...makeEmail(1, 'uuid-b1'), subject: 'B subject', content: 'B body' }
    const { result, rerender } = renderHook(
      ({ list, campaignId }: { list: Email[]; campaignId: string }) =>
        useEmailAutosave(list, campaignId, updateEmail),
      { initialProps: { list: [emailA], campaignId: 'camp-a' } },
    )

    rerender({ list: [emailB], campaignId: 'camp-b' })
    await act(async () => {
      await result.current.saveEmail(1, { subject: 'B edited' })
    })
    rerender({ list: [{ ...emailB, subject: 'B edited' }], campaignId: 'camp-b' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    expect(saveVersionMock).toHaveBeenCalledTimes(1)
    expect(saveVersionMock).toHaveBeenCalledWith('uuid-b1', 1, {
      subject: 'B subject',
      content: 'B body',
    })
  })

  // Same id collision: a pending write for campaign A read the emails list
  // when its timer fired, by then campaign B's, and wrote B's text into A.
  it('switching campaign writes a pending edit with the old campaign text', async () => {
    const updateEmail = vi.fn()
    const emailB = { ...makeEmail(1, 'uuid-b1'), subject: 'B subject', content: 'B body' }
    const { result, rerender } = renderHook(
      ({ list, campaignId }: { list: Email[]; campaignId: string }) =>
        useEmailAutosave(list, campaignId, updateEmail),
      { initialProps: { list: [makeEmail(1)], campaignId: 'camp-a' } },
    )

    await act(async () => {
      await result.current.saveEmail(1, { subject: 'A edited' })
    })
    rerender({ list: [emailB], campaignId: 'camp-b' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EMAIL_SAVE_DEBOUNCE_MS + 50)
    })

    expect(updateEmailDbMock).toHaveBeenCalledTimes(1)
    expect(updateEmailDbMock).toHaveBeenCalledWith('camp-a', 1, {
      subject: 'A edited',
      content: 'C1',
      preview: 'P1',
    })
  })
})
