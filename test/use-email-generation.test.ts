import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'
import { CampaignService } from '@/lib/services/campaign.service'

const config = { tone: 'friendly', campaignType: 'nurture', days: 3 }
const successResponse = {
  emails: [
    { id: 1, day: 1, subject: 's', preview: 'p', content: 'c' },
    { id: 2, day: 2, subject: 's2', preview: 'p2', content: 'c2' },
  ],
}

describe('useEmailGeneration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes clean', () => {
    const { result } = renderHook(() => useEmailGeneration())
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.warning).toBeNull()
  })

  it('calls CampaignService.generateEmails and returns result', async () => {
    const spy = vi.spyOn(CampaignService, 'generateEmails').mockResolvedValue(successResponse)

    const { result } = renderHook(() => useEmailGeneration())
    let returned: typeof successResponse | null = null
    await act(async () => {
      returned = await result.current.generateEmails('https://example.com', 'content', config)
    })
    expect(spy).toHaveBeenCalledOnce()
    expect(returned).toEqual(successResponse)
    expect(result.current.isGenerating).toBe(false)
  })

  it('passes landingAnalysis through to service', async () => {
    const spy = vi.spyOn(CampaignService, 'generateEmails').mockResolvedValue(successResponse)
    const analysis = {
      valueProp: 'x',
      targetAudience: 'y',
      primaryCTA: 'z',
      toneFingerprint: 't',
      objections: [],
      proofPoints: [],
      angles: ['a'],
      opportunities: [],
    }

    const { result } = renderHook(() => useEmailGeneration())
    await act(async () => {
      await result.current.generateEmails(
        'https://example.com',
        'content',
        config,
        'camp-id',
        analysis,
      )
    })

    const [, , , , , analysisArg] = spy.mock.calls[0]
    expect(analysisArg).toEqual(analysis)
  })

  it('sets warning from service response', async () => {
    vi.spyOn(CampaignService, 'generateEmails').mockResolvedValue({
      ...successResponse,
      warning: 'did not save',
    })

    const { result } = renderHook(() => useEmailGeneration())
    await act(async () => {
      await result.current.generateEmails('https://example.com', 'content', config)
    })
    expect(result.current.warning).toBe('did not save')
  })

  it('sets error on service failure', async () => {
    vi.spyOn(CampaignService, 'generateEmails').mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useEmailGeneration())
    await act(async () => {
      const out = await result.current.generateEmails('https://example.com', 'c', config)
      expect(out).toBeNull()
    })
    expect(result.current.error).toBeTruthy()
  })

  it('returns null without error when AbortError is thrown', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    vi.spyOn(CampaignService, 'generateEmails').mockRejectedValue(abortErr)

    const { result } = renderHook(() => useEmailGeneration())
    let returned: typeof successResponse | null = null
    await act(async () => {
      returned = await result.current.generateEmails('https://example.com', 'c', config)
    })
    expect(returned).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('clearError and clearWarning reset state', async () => {
    vi.spyOn(CampaignService, 'generateEmails').mockResolvedValue({
      ...successResponse,
      warning: 'w',
    })

    const { result } = renderHook(() => useEmailGeneration())
    await act(async () => {
      await result.current.generateEmails('https://example.com', 'c', config)
    })
    expect(result.current.warning).toBe('w')

    act(() => result.current.clearWarning())
    expect(result.current.warning).toBeNull()
  })

  it('aborts previous generation when called again', async () => {
    const seenSignals: (AbortSignal | undefined)[] = []
    vi.spyOn(CampaignService, 'generateEmails').mockImplementation(
      async (_url, _content, _config, _id, signal) => {
        seenSignals.push(signal)
        await new Promise((r) => setTimeout(r, 50))
        return successResponse
      },
    )

    const { result } = renderHook(() => useEmailGeneration())
    act(() => {
      void result.current.generateEmails('https://example.com/a', 'c', config)
    })
    act(() => {
      void result.current.generateEmails('https://example.com/b', 'c', config)
    })
    // Give microtasks time to flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(seenSignals[0]?.aborted).toBe(true)
  })
})
