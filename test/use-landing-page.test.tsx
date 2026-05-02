import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLandingPage } from '@/lib/hooks/use-landing-page'
import { CampaignService } from '@/lib/services/campaign.service'
import type { ScrapeStreamEvent } from '@/lib/types/scrape-progress'
import type { LandingPageData } from '@/lib/types'

const validData: LandingPageData = {
  url: 'https://example.com',
  content: '<p>hi</p>',
  metadata: { title: 'Example', ogSiteName: 'Example Inc' },
}

describe('useLandingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with connecting stage and no error', () => {
    const { result } = renderHook(() => useLandingPage())
    expect(result.current.isAnalyzing).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.progressState.currentStageId).toBe('connecting')
    expect(result.current.progressState.completedStageIds).toEqual([])
  })

  it('sets domain in dynamicContext when analyze starts', async () => {
    let sendEvents: (events: ScrapeStreamEvent[]) => void = () => {}
    const streamPromise = new Promise<LandingPageData>((resolve) => {
      vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockImplementation(
        async (_url, onEvent) => {
          await new Promise<void>((tick) => {
            sendEvents = (events) => {
              for (const e of events) onEvent(e)
              tick()
            }
          })
          return validData
        },
      )
      void resolve
    })
    void streamPromise

    const { result } = renderHook(() => useLandingPage())
    act(() => {
      void result.current.analyzeLandingPage('https://sub.example.com/page')
    })

    await waitFor(() =>
      expect(result.current.progressState.dynamicContext.domain).toBe('sub.example.com'),
    )

    act(() => sendEvents([{ type: 'complete', data: validData } as ScrapeStreamEvent]))
  })

  it('advances currentStageId as stage events arrive', async () => {
    let emit: (event: ScrapeStreamEvent) => void = () => {}
    let finish: (data: LandingPageData) => void = () => {}
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockImplementation(
      async (_url, onEvent) => {
        emit = (e) => onEvent(e)
        return new Promise<LandingPageData>((resolve) => {
          finish = resolve
        })
      },
    )

    const { result } = renderHook(() => useLandingPage())
    act(() => {
      void result.current.analyzeLandingPage('https://example.com')
    })

    act(() => emit({ type: 'stage', stageId: 'fetching' }))
    await waitFor(() => expect(result.current.progressState.currentStageId).toBe('fetching'))
    expect(result.current.progressState.completedStageIds).toContain('connecting')

    act(() => emit({ type: 'stage', stageId: 'extracting' }))
    await waitFor(() => expect(result.current.progressState.currentStageId).toBe('extracting'))

    act(() => finish(validData))
    await waitFor(() => expect(result.current.isAnalyzing).toBe(false))
  })

  it('merges context patches from stage events', async () => {
    let emit: (event: ScrapeStreamEvent) => void = () => {}
    let finish: (data: LandingPageData) => void = () => {}
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockImplementation(
      async (_url, onEvent) => {
        emit = (e) => onEvent(e)
        return new Promise((resolve) => {
          finish = resolve
        })
      },
    )

    const { result } = renderHook(() => useLandingPage())
    act(() => {
      void result.current.analyzeLandingPage('https://example.com')
    })

    act(() =>
      emit({
        type: 'stage',
        stageId: 'extracting',
        context: { title: 'Real Title', siteName: 'Real Site' },
      }),
    )
    await waitFor(() => {
      expect(result.current.progressState.dynamicContext.title).toBe('Real Title')
      expect(result.current.progressState.dynamicContext.siteName).toBe('Real Site')
    })

    act(() => finish(validData))
  })

  it('resolves with LandingPageData and sets currentStageId to completed', async () => {
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockResolvedValue(validData)

    const { result } = renderHook(() => useLandingPage())

    let returned: LandingPageData | null = null
    await act(async () => {
      returned = await result.current.analyzeLandingPage('https://example.com')
    })

    expect(returned).toEqual(validData)
    expect(result.current.isAnalyzing).toBe(false)
    expect(result.current.progressState.currentStageId).toBe('completed')
  })

  it('sets error state and returns null when stream throws', async () => {
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValue(
      new Error('scrape failed'),
    )

    const { result } = renderHook(() => useLandingPage())

    let returned: LandingPageData | null = null
    await act(async () => {
      returned = await result.current.analyzeLandingPage('https://example.com')
    })

    expect(returned).toBeNull()
    expect(result.current.error).toBe('scrape failed')
    expect(result.current.isAnalyzing).toBe(false)
  })

  it('returns generic message for non-Error throws', async () => {
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValue('boom')

    const { result } = renderHook(() => useLandingPage())
    await act(async () => {
      await result.current.analyzeLandingPage('https://example.com')
    })
    expect(result.current.error).toMatch(/failed to analyze/i)
  })

  it('returns null without error when AbortError is thrown', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValue(abortErr)

    const { result } = renderHook(() => useLandingPage())
    let returned: LandingPageData | null = null
    await act(async () => {
      returned = await result.current.analyzeLandingPage('https://example.com')
    })
    expect(returned).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('clearError resets error state', async () => {
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValue(new Error('x'))

    const { result } = renderHook(() => useLandingPage())
    await act(async () => {
      await result.current.analyzeLandingPage('https://example.com')
    })
    expect(result.current.error).toBe('x')

    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('error event from stream sets error state', async () => {
    let emit: (event: ScrapeStreamEvent) => void = () => {}
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockImplementation(
      async (_url, onEvent) => {
        emit = (e) => onEvent(e)
        throw new Error('from stream')
      },
    )
    const { result } = renderHook(() => useLandingPage())
    await act(async () => {
      const p = result.current.analyzeLandingPage('https://example.com')
      emit({ type: 'error', message: 'from stream' })
      await p
    })
    expect(result.current.error).toBe('from stream')
  })

  it('lastResultRef tracks success / failure / aborted independently', async () => {
    // Success path.
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockResolvedValueOnce(validData)
    const { result } = renderHook(() => useLandingPage())
    await act(async () => {
      await result.current.analyzeLandingPage('https://example.com')
    })
    expect(result.current.lastResultRef.current).toBe('success')

    // Real failure (non-Abort throw).
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValueOnce(new Error('boom'))
    await act(async () => {
      await result.current.analyzeLandingPage('https://example.com')
    })
    expect(result.current.lastResultRef.current).toBe('failure')

    // Aborted.
    const abortErr = new Error('cancelled')
    abortErr.name = 'AbortError'
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockRejectedValueOnce(abortErr)
    await act(async () => {
      await result.current.analyzeLandingPage('https://example.com')
    })
    // The form uses this to gate the `scrape_failed` analytics event — if
    // 'aborted' starts coming back as 'failure', we'll over-count the funnel.
    expect(result.current.lastResultRef.current).toBe('aborted')
  })

  it('aborts prior request when a new analyze call fires', async () => {
    const abortedSignals: AbortSignal[] = []
    vi.spyOn(CampaignService, 'scrapeLandingPageStream').mockImplementation(
      async (_url, _onEvent, signal) => {
        if (signal) abortedSignals.push(signal)
        await new Promise((r) => setTimeout(r, 100))
        return validData
      },
    )

    const { result } = renderHook(() => useLandingPage())
    act(() => {
      void result.current.analyzeLandingPage('https://example.com/a')
    })
    act(() => {
      void result.current.analyzeLandingPage('https://example.com/b')
    })
    await waitFor(() => expect(abortedSignals.length).toBe(2))
    expect(abortedSignals[0].aborted).toBe(true)
  })
})
