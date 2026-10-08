import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Email, LandingPageData, CampaignConfig } from '@/lib/types'

const appendGeneratedEmailMock = vi.fn()
const replaceGeneratedEmailsLocalMock = vi.fn()

vi.mock('@/lib/campaign-context', () => ({
  useCampaignActions: () => ({
    appendGeneratedEmail: appendGeneratedEmailMock,
    replaceGeneratedEmailsLocal: replaceGeneratedEmailsLocalMock,
  }),
}))

const trackMock = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => trackMock(...args),
}))

import { CampaignService } from '@/lib/services/campaign.service'
import { useEmailStreaming } from '@/lib/hooks/use-email-streaming'

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

describe('useEmailStreaming', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    appendGeneratedEmailMock.mockReset()
    replaceGeneratedEmailsLocalMock.mockReset()
    trackMock.mockReset()
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
      await result.current.generateEmailsStream(landingPageData, config, 'camp-id')
    })

    // 3 email events but only one funnel event — the metric is "did the user
    // ever see an email arrive," not raw count. Re-fires would inflate the
    // funnel and double-count time-to-first-email downstream.
    const fired = trackMock.mock.calls.filter((c) => c[0] === 'first_email_streamed')
    expect(fired).toHaveLength(1)
    expect(fired[0][1]).toEqual({ campaignId: 'camp-id' })
  })

  it('first_email_streamed re-arms across separate stream invocations', async () => {
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
})
