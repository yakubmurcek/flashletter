import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Email, LandingPageData, CampaignConfig } from '@/lib/types'

const appendGeneratedEmailMock = vi.fn()
const replaceGeneratedEmailsLocalMock = vi.fn()
// What the editor currently shows. Tests change it and rerender to mimic
// the provider re-rendering after a local edit or a campaign switch.
let campaignData: { generatedEmails: Email[]; currentCampaignId: string | null } = {
  generatedEmails: [],
  currentCampaignId: null,
}

vi.mock('@/lib/campaign-context', () => ({
  useCampaignActions: () => ({
    appendGeneratedEmail: appendGeneratedEmailMock,
    replaceGeneratedEmailsLocal: replaceGeneratedEmailsLocalMock,
  }),
  useCampaignData: () => campaignData,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}),
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
  isCapturing: () => true,
}))

import {
  CampaignService,
  RateLimitedError,
  type GenerateEmailsStreamEvent,
} from '@/lib/services/campaign.service'
import { useEmailStreaming } from '@/lib/hooks/use-email-streaming'
import { PlanLimitError } from '@/lib/billing/errors'

const landingPageData: LandingPageData = {
  url: 'https://example.com',
  content: 'page content',
}
const config: CampaignConfig = { tone: 'friendly', campaignType: 'nurture', days: 3 }

const makeEmail = (day: number, uuid: string | null = null): Email =>
  ({
    id: day,
    uuid,
    day,
    subject: `Subject ${day}`,
    preview: `p${day}`,
    content: `c${day}`,
  }) as Email

// A stream the test drives event by event, finishing it when it wants to.
function controlledStream() {
  let onEvent: (event: GenerateEmailsStreamEvent) => void = () => {}
  let resolve: (emails: Email[]) => void = () => {}
  let reject: (err: unknown) => void = () => {}
  let signal: AbortSignal | undefined
  vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
    (_u, _c, _cfg, handler, options) => {
      onEvent = handler
      signal = options?.signal
      return new Promise<Email[]>((res, rej) => {
        resolve = res
        reject = rej
      })
    },
  )
  return {
    emit: (event: GenerateEmailsStreamEvent) => onEvent(event),
    finish: (emails: Email[]) => {
      onEvent({ type: 'complete', emails })
      resolve(emails)
    },
    fail: (err: unknown) => reject(err),
    get signal() {
      return signal
    },
  }
}

describe('useEmailStreaming', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    appendGeneratedEmailMock.mockReset()
    replaceGeneratedEmailsLocalMock.mockReset()
    trackMock.mockReset()
    updateEmailDbMock.mockReset().mockResolvedValue(undefined)
    campaignData = { generatedEmails: [], currentCampaignId: null }
  })

  it('initializes clean', () => {
    const { result } = renderHook(() => useEmailStreaming())
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedCount).toBe(0)
    expect(result.current.totalExpected).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.warning).toBeNull()
  })

  it('forwards stream events: appends each email and tracks count', async () => {
    const emailsFromServer = [makeEmail(1, 'u1'), makeEmail(2, 'u2'), makeEmail(3, 'u3')]
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_url, _content, _cfg, onEvent) => {
        onEvent({ type: 'start', total: 3 })
        onEvent({ type: 'email', email: makeEmail(1) })
        onEvent({ type: 'email', email: makeEmail(2) })
        onEvent({ type: 'email', email: makeEmail(3) })
        onEvent({ type: 'complete', emails: emailsFromServer })
        return emailsFromServer
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    let returned: Email[] | null = null
    await act(async () => {
      returned = await result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })

    expect(returned).toEqual(emailsFromServer)
    expect(appendGeneratedEmailMock).toHaveBeenCalledTimes(3)
    expect(result.current.streamedCount).toBe(3)
    expect(result.current.totalExpected).toBe(3)
    expect(result.current.isStreaming).toBe(false)
    // Local replace called twice: empty before, then with persisted emails
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenNthCalledWith(1, [])
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenLastCalledWith(emailsFromServer)
  })

  it('updates totalExpected from start event', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'start', total: 7 })
        onEvent({ type: 'complete', emails: [] })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.totalExpected).toBe(7)
  })

  it('captures warning from complete event', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'complete', emails: [], warning: 'persistence failed' })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.warning).toBe('persistence failed')
  })

  it('captures error from error event (event-level, not throw)', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'error', message: 'rate limited' })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.error).toBe('rate limited')
  })

  it('returns null and sets error when service throws', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useEmailStreaming())
    let returned: Email[] | null = null
    await act(async () => {
      returned = await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(returned).toBeNull()
    expect(result.current.error).toBeTruthy()
  })

  it('tells the user to wait when the server rate-limits the generation', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockRejectedValue(new RateLimitedError())
    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.error).toMatch(/wait a minute/i)
  })

  it('returns null without setting error on AbortError', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    vi.spyOn(CampaignService, 'generateEmailsStream').mockRejectedValue(abortErr)

    const { result } = renderHook(() => useEmailStreaming())
    let returned: Email[] | null = null
    await act(async () => {
      returned = await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(returned).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('fires first_email_streamed exactly once per stream session', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_url, _content, _cfg, onEvent) => {
        onEvent({ type: 'start', total: 3 })
        onEvent({ type: 'email', email: makeEmail(1) })
        onEvent({ type: 'email', email: makeEmail(2) })
        onEvent({ type: 'email', email: makeEmail(3) })
        onEvent({ type: 'complete', emails: [] })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'once-camp')
    })

    // 3 email events but only one funnel event — the metric is "did the user
    // ever see an email arrive," not raw count. Re-fires would inflate the
    // funnel and double-count time-to-first-email downstream.
    const fired = trackMock.mock.calls.filter((c) => c[0] === 'first_email_streamed')
    expect(fired).toHaveLength(1)
    expect(fired[0][1]).toEqual({ campaignId: 'once-camp' })
  })

  it('first_email_streamed re-arms for a different campaign', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'email', email: makeEmail(1) })
        onEvent({ type: 'complete', emails: [] })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'a')
    })
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'b')
    })

    const fired = trackMock.mock.calls.filter((c) => c[0] === 'first_email_streamed')
    expect(fired).toHaveLength(2)
  })

  it('does not re-fire first_email_streamed when the same campaign is regenerated', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'email', email: makeEmail(1) })
        onEvent({ type: 'complete', emails: [] })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'regen-camp')
    })
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'regen-camp')
    })

    const fired = trackMock.mock.calls.filter((c) => c[0] === 'first_email_streamed')
    expect(fired).toHaveLength(1)
  })

  it('logs limit_reached with the limit the server named (emails, not campaigns)', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockRejectedValue(
      new PlanLimitError('Up to 7 emails on your plan.', 'free', 'emails'),
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, 'limit-camp')
    })

    expect(trackMock).toHaveBeenCalledWith('limit_reached', { plan: 'free', limit: 'emails' })
  })

  it('aborts previous stream when called again', async () => {
    const seenSignals: (AbortSignal | undefined)[] = []
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, _onEvent, options) => {
        seenSignals.push(options?.signal)
        await new Promise((r) => setTimeout(r, 50))
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    act(() => {
      void result.current.generateEmailsStream(landingPageData, config, null)
    })
    act(() => {
      void result.current.generateEmailsStream(landingPageData, config, null)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(seenSignals[0]?.aborted).toBe(true)
  })

  it('clearError and clearWarning reset state', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'complete', emails: [], warning: 'w' })
        return []
      },
    )
    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.warning).toBe('w')

    act(() => result.current.clearWarning())
    expect(result.current.warning).toBeNull()

    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('clears prior emails before streaming begins', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'complete', emails: [] })
        return []
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    // First call must clear local state to []
    expect(replaceGeneratedEmailsLocalMock.mock.calls[0]).toEqual([[]])
  })

  it('forwards landingAnalysis and campaignId to the service', async () => {
    const spy = vi
      .spyOn(CampaignService, 'generateEmailsStream')
      .mockImplementation(async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'complete', emails: [] })
        return []
      })

    const analysis = {
      valueProp: 'a',
      targetAudience: 'b',
      primaryCTA: 'c',
      toneFingerprint: 'd',
      objections: [],
      proofPoints: [],
      angles: ['x'],
      opportunities: [],
    }
    const dataWithAnalysis: LandingPageData = { ...landingPageData, analysis }

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(dataWithAnalysis, config, 'camp-7')
    })

    const [url, content, cfg, , options] = spy.mock.calls[0]
    expect(url).toBe('https://example.com')
    expect(content).toBe('page content')
    expect(cfg).toEqual(config)
    expect(options?.campaignId).toBe('camp-7')
    expect(options?.landingAnalysis).toEqual(analysis)
  })
  // Bug: typing into Day 1 while Days 2..N were still streaming was wiped
  // when the server's persisted batch replaced the local list.
  it('keeps an email edited during the stream and still takes its server ids', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-id' }
    const { result, rerender } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1) }))

    // The user edits Day 1 while Day 2 is still being written.
    campaignData = {
      ...campaignData,
      generatedEmails: [{ ...makeEmail(1), subject: 'My subject', content: 'My body' }],
    }
    rerender()
    act(() => stream.emit({ type: 'email', email: makeEmail(2) }))

    const server = [makeEmail(1, 'u1'), makeEmail(2, 'u2')]
    let returned: Email[] | null = null
    await act(async () => {
      stream.finish(server)
      returned = await pending
    })

    const merged = replaceGeneratedEmailsLocalMock.mock.lastCall?.[0] as Email[]
    expect(merged[0]).toEqual({
      ...makeEmail(1, 'u1'),
      subject: 'My subject',
      content: 'My body',
    })
    expect(merged[1]).toEqual(makeEmail(2, 'u2'))
    expect(returned).toEqual(merged)
    // The server persisted its own text, so the kept edit is written back.
    await waitFor(() =>
      expect(updateEmailDbMock).toHaveBeenCalledWith('camp-id', 1, {
        subject: 'My subject',
        content: 'My body',
        preview: 'p1',
      }),
    )
    expect(updateEmailDbMock).toHaveBeenCalledTimes(1)
  })

  it('takes the server payload for untouched emails even when it differs from the stream', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-id' }
    const { result, rerender } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1) }))
    campaignData = { ...campaignData, generatedEmails: [makeEmail(1)] }
    rerender()

    const server = [{ ...makeEmail(1, 'u1'), subject: 'Cleaned by server' }]
    await act(async () => {
      stream.finish(server)
      await pending
    })

    expect(replaceGeneratedEmailsLocalMock).toHaveBeenLastCalledWith(server)
    expect(updateEmailDbMock).not.toHaveBeenCalled()
  })

  // Bug: leaving the editor mid-stream kept writing the old campaign's
  // emails into state, which the next opened campaign then showed.
  it('stops writing into state once the editor unmounts', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-a' }
    const { result, unmount } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-a')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1) }))
    unmount()

    stream.emit({ type: 'email', email: makeEmail(2) })
    stream.finish([makeEmail(1, 'u1'), makeEmail(2, 'u2')])
    await expect(pending).resolves.toBeNull()

    expect(appendGeneratedEmailMock).toHaveBeenCalledTimes(1)
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenCalledTimes(1)
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenCalledWith([])
    // The request itself runs on so the server still saves campaign A.
    expect(stream.signal?.aborted).toBe(false)
  })

  it('stops writing into state when another campaign is opened in the same editor', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-a' }
    const { result, rerender } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-a')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1) }))

    campaignData = { generatedEmails: [makeEmail(1, 'b1')], currentCampaignId: 'camp-b' }
    rerender()
    expect(result.current.isStreaming).toBe(false)

    await act(async () => {
      stream.emit({ type: 'email', email: makeEmail(2) })
      stream.finish([makeEmail(1, 'u1'), makeEmail(2, 'u2')])
      await pending
    })

    expect(appendGeneratedEmailMock).toHaveBeenCalledTimes(1)
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenCalledTimes(1)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedCount).toBe(0)
  })

  it('a stream that started before the campaign id reached context is not dropped', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: null }
    const { result, rerender } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-a')
    })
    campaignData = { ...campaignData, currentCampaignId: 'camp-a' }
    rerender()
    await act(async () => {
      stream.emit({ type: 'email', email: makeEmail(1) })
      stream.finish([makeEmail(1, 'u1')])
      await pending
    })

    expect(appendGeneratedEmailMock).toHaveBeenCalledTimes(1)
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenLastCalledWith([makeEmail(1, 'u1')])
  })

  it('an aborted earlier stream does not end the newer stream', async () => {
    const first = controlledStream()
    const { result } = renderHook(() => useEmailStreaming())
    let firstPending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      firstPending = result.current.generateEmailsStream(landingPageData, config, null)
    })
    const second = controlledStream()
    act(() => {
      void result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(first.signal?.aborted).toBe(true)

    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    await act(async () => {
      first.fail(abortErr)
      await firstPending
    })
    expect(result.current.isStreaming).toBe(true)
    expect(result.current.error).toBeNull()
    expect(second.signal?.aborted).toBe(false)
  })

  // Bug: the server's specific message (e.g. a limit reached) was replaced
  // by a generic "Please try again" once the service rethrew it.
  it('keeps the server error message instead of a generic one', async () => {
    const message = 'You have used all your generations this month.'
    vi.spyOn(CampaignService, 'generateEmailsStream').mockImplementation(
      async (_u, _c, _cfg, onEvent) => {
        onEvent({ type: 'error', message })
        throw new Error(message)
      },
    )

    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.error).toBe(message)
  })

  it('falls back to a generic message when there is no specific one', async () => {
    vi.spyOn(CampaignService, 'generateEmailsStream').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )
    const { result } = renderHook(() => useEmailStreaming())
    await act(async () => {
      await result.current.generateEmailsStream(landingPageData, config, null)
    })
    expect(result.current.error).toBe('Network error. Please check your connection and try again.')
  })

  // Bug: when Days 2..N failed, Day 1 stayed on screen with no database row.
  // The server now saves Day 1 before sending it; the editor must keep that
  // saved Day 1 (with its id) next to the error, not clear it.
  it('keeps the saved Day 1 on screen when the rest of the sequence fails', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-id' }
    const { result } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1, 'u1') }))
    await act(async () => {
      stream.emit({ type: 'error', message: 'The AI service is busy right now.' })
      stream.fail(new Error('The AI service is busy right now.'))
      await pending
    })

    expect(appendGeneratedEmailMock).toHaveBeenCalledWith(makeEmail(1, 'u1'))
    // Only the clear at the start; nothing wiped Day 1 afterwards.
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenCalledTimes(1)
    expect(replaceGeneratedEmailsLocalMock).toHaveBeenCalledWith([])
    expect(result.current.error).toBe('The AI service is busy right now.')
    expect(result.current.isStreaming).toBe(false)
  })

  it('warns when an edit made during generation could not be saved', async () => {
    const stream = controlledStream()
    campaignData = { generatedEmails: [], currentCampaignId: 'camp-id' }
    updateEmailDbMock.mockRejectedValue(
      Object.assign(new Error('Day 1 is not saved yet'), { name: 'EmailNotSavedError' }),
    )
    const { result, rerender } = renderHook(() => useEmailStreaming())

    let pending: Promise<Email[] | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })
    act(() => stream.emit({ type: 'email', email: makeEmail(1) }))
    campaignData = {
      ...campaignData,
      generatedEmails: [{ ...makeEmail(1), subject: 'My subject' }],
    }
    rerender()
    await act(async () => {
      stream.finish([makeEmail(1, 'u1')])
      await pending
    })

    await waitFor(() => expect(result.current.warning).toMatch(/edit.*not saved/i))
  })
})
