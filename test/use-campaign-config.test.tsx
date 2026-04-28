import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCampaignConfig } from '@/lib/hooks/use-campaign-config'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/lib/campaign-context', () => ({
  useCampaignData: vi.fn(),
  useCampaignActions: vi.fn(),
}))

vi.mock('@/lib/hooks/use-email-generation', () => ({
  useEmailGeneration: vi.fn(),
}))

import { useRouter } from 'next/navigation'
import { useCampaignData, useCampaignActions } from '@/lib/campaign-context'
import { useEmailGeneration } from '@/lib/hooks/use-email-generation'

describe('useCampaignConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default config values', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(result.current.tone).toBeDefined()
    expect(result.current.campaignType).toBeDefined()
    expect(result.current.days).toBeDefined()
    expect(result.current.isReady).toBe(false)
  })

  it('exposes config setters', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(typeof result.current.setTone).toBe('function')
    expect(typeof result.current.setCampaignType).toBe('function')
    expect(typeof result.current.setDays).toBe('function')
  })

  it('updates tone state', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    act(() => {
      result.current.setTone('professional')
    })

    expect(result.current.tone).toBe('professional')
  })

  it('returns isReady=false when no landing page data', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(result.current.isReady).toBe(false)
  })

  it('returns isReady=true when landing page data present', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(result.current.isReady).toBe(true)
  })

  it('loads campaign when validCampaignId provided', async () => {
    const mockLoadCampaign = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: 'camp-123',
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: mockLoadCampaign,
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    renderHook(() => useCampaignConfig('camp-123'))

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledWith('camp-123')
    })
  })

  it('redirects to /create when no landing page data on mount', async () => {
    const mockPush = vi.fn()

    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: null,
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)

    renderHook(() => useCampaignConfig(null))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/create')
    })
  })

  it('exposes error and warning from useEmailGeneration', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: 'Generation error',
      warning: 'Generation warning',
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(result.current.error).toBe('Generation error')
    expect(result.current.warning).toBe('Generation warning')
  })

  it('exposes handleSubmit method', () => {
    vi.mocked(useCampaignData).mockReturnValue({
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      isLoading: false,
      currentCampaignId: null,
    } as any)

    vi.mocked(useCampaignActions).mockReturnValue({
      setConfig: vi.fn(),
      setGeneratedEmails: vi.fn(),
      updateCampaignConfig: vi.fn(),
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useEmailGeneration).mockReturnValue({
      isGenerating: false,
      error: null,
      warning: null,
      generateEmails: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignConfig(null))

    expect(typeof result.current.handleSubmit).toBe('function')
  })
})
