import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { FormEvent } from 'react'
import { useCampaignConfig } from '@/lib/hooks/use-campaign-config'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/lib/campaign-context', () => ({
  useCampaignData: vi.fn(),
  useCampaignActions: vi.fn(),
}))
vi.mock('@/lib/hooks/use-email-generation', () => ({ useEmailGeneration: vi.fn() }))
vi.mock('@/lib/hooks/use-plan', () => ({ usePlan: vi.fn() }))

import { useRouter } from 'next/navigation'
import { useCampaignData, useCampaignActions } from '@/lib/campaign-context'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'
import { usePlan } from '@/lib/hooks/use-plan'

const push = vi.fn()
const applyConfigToCampaign = vi.fn().mockResolvedValue(undefined)
const generateEmails = vi.fn()
const createNewCampaign = vi.fn()

function setup(maxEmails: number, currentCampaignId: string | null = 'camp-1') {
  vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>)
  vi.mocked(useCampaignData).mockReturnValue({
    landingPageData: { url: 'https://e.com', content: 'x' },
    isLoading: false,
    currentCampaignId,
  } as unknown as ReturnType<typeof useCampaignData>)
  vi.mocked(useCampaignActions).mockReturnValue({
    setConfig: vi.fn(),
    setGeneratedEmails: vi.fn(),
    updateCampaignConfig: vi.fn(),
    applyConfigToCampaign,
    createNewCampaign,
    loadCampaign: vi.fn(),
  } as unknown as ReturnType<typeof useCampaignActions>)
  vi.mocked(useEmailGeneration).mockReturnValue({
    isGenerating: false,
    error: null,
    warning: null,
    generateEmails,
  } as unknown as ReturnType<typeof useEmailGeneration>)
  vi.mocked(usePlan).mockReturnValue({ plan: 'free', maxEmails })
}

describe('useCampaignConfig submit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('defaults to an email count the free plan allows', () => {
    setup(5)
    const { result } = renderHook(() => useCampaignConfig(null))
    expect(result.current.days[0]).toBeLessThanOrEqual(5)
  })

  it('clamps the default down when the plan allows fewer emails', () => {
    setup(4)
    const { result } = renderHook(() => useCampaignConfig(null))
    expect(result.current.days[0]).toBe(4)
  })

  it('saves the settings and hands generation to the streaming editor', async () => {
    setup(5)
    const { result } = renderHook(() => useCampaignConfig(null))
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as FormEvent)
    })
    expect(applyConfigToCampaign).toHaveBeenCalledWith(
      'camp-1',
      expect.objectContaining({ days: 5 }),
    )
    expect(push).toHaveBeenCalledWith('/create/editor?campaign=camp-1&email=1&autogen=1')
    expect(generateEmails).not.toHaveBeenCalled()
  })

  // Generation is counted per saved campaign, so the server refuses one with
  // no campaign id. The fallback used to generate without one.
  it('creates the campaign first when there is none yet', async () => {
    setup(5, null)
    createNewCampaign.mockResolvedValueOnce('camp-new')
    const { result } = renderHook(() => useCampaignConfig(null))
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as FormEvent)
    })
    expect(createNewCampaign).toHaveBeenCalledWith({ url: 'https://e.com', content: 'x' })
    expect(applyConfigToCampaign).toHaveBeenCalledWith('camp-new', expect.anything())
    expect(push).toHaveBeenCalledWith('/create/editor?campaign=camp-new&email=1&autogen=1')
    expect(generateEmails).not.toHaveBeenCalled()
  })

  it('shows an error and re-enables the form when saving fails', async () => {
    setup(5, null)
    createNewCampaign.mockRejectedValueOnce(new Error('insert failed'))
    const { result } = renderHook(() => useCampaignConfig(null))
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as FormEvent)
    })
    expect(result.current.error).toMatch(/try again/i)
    expect(result.current.isSubmitting).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })
})
