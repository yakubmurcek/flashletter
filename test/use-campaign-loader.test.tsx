import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCampaignLoader } from '@/lib/hooks/use-campaign-loader'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('@/lib/campaign-context', () => ({
  useCampaign: vi.fn(),
}))

vi.mock('@/lib/hooks/use-url-state', () => ({
  useUrlState: vi.fn(),
}))

import { useRouter, useSearchParams } from 'next/navigation'
import { useCampaign } from '@/lib/campaign-context'
import { useUrlState } from '@/lib/hooks/use-url-state'

describe('useCampaignLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with idle state', () => {
    vi.mocked(useCampaign).mockReturnValue({
      campaignName: null,
      landingPageData: null,
      config: null,
      generatedEmails: [],
      isLoading: false,
      currentCampaignId: null,
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    } as any)

    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue(null),
      cleanupParams: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignLoader())

    expect(result.current.loadingState).toBe('idle')
    expect(result.current.campaignData).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('exposes loadCampaign method', () => {
    vi.mocked(useCampaign).mockReturnValue({
      campaignName: null,
      landingPageData: null,
      config: null,
      generatedEmails: [],
      isLoading: false,
      currentCampaignId: null,
      loadCampaign: vi.fn(),
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue(null),
      cleanupParams: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignLoader())

    expect(typeof result.current.loadCampaign).toBe('function')
  })

  it('loads campaign from URL on mount', async () => {
    const mockLoadCampaign = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useCampaign).mockReturnValue({
      campaignName: 'Test Campaign',
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      config: { tone: 'friendly', campaignType: 'nurture', days: 3 },
      generatedEmails: [],
      isLoading: false,
      currentCampaignId: 'camp-123',
      loadCampaign: mockLoadCampaign,
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue('camp-123'),
      cleanupParams: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignLoader())

    await waitFor(() => {
      expect(result.current.loadingState).toBe('loaded')
    })

    expect(mockLoadCampaign).toHaveBeenCalledWith('camp-123')
  })

  it('handles campaign load error and redirects', async () => {
    const mockLoadCampaign = vi.fn().mockRejectedValue(new Error('Campaign not found'))

    const mockPush = vi.fn()

    vi.mocked(useCampaign).mockReturnValue({
      campaignName: null,
      landingPageData: null,
      config: null,
      generatedEmails: [],
      isLoading: false,
      currentCampaignId: null,
      loadCampaign: mockLoadCampaign,
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any)

    const mockCleanupParams = vi.fn()
    // Use null URL id so the secondary useEffect can't keep flipping the
    // state back to 'loading' (it watches `campaignIdFromUrl !== loadedId`,
    // and a failed load leaves loadedCampaignId at null forever).
    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue(null),
      cleanupParams: mockCleanupParams,
    } as any)

    const { result } = renderHook(() => useCampaignLoader())

    await act(async () => {
      await result.current.loadCampaign('camp-123')
    })

    expect(result.current.error).toBe('Campaign not found')
    expect(result.current.loadingState).toBe('error')
    expect(mockCleanupParams).toHaveBeenCalledWith([])
    expect(mockPush).toHaveBeenCalledWith('/campaigns')
  })

  it('returns campaign data when loaded', async () => {
    const mockLoadCampaign = vi.fn().mockResolvedValue(undefined)

    const campaignData = {
      name: 'Test Campaign',
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      config: { tone: 'friendly', campaignType: 'nurture', days: 3 },
      emails: [{ id: 1, uuid: 'email-1', day: 1, subject: 'Day 1', preview: 'p', content: 'c' }],
    }

    vi.mocked(useCampaign).mockReturnValue({
      campaignName: campaignData.name,
      landingPageData: campaignData.landingPageData,
      config: campaignData.config,
      generatedEmails: campaignData.emails,
      isLoading: false,
      currentCampaignId: 'camp-123',
      loadCampaign: mockLoadCampaign,
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue(null),
      cleanupParams: vi.fn(),
    } as any)

    const { result } = renderHook(() => useCampaignLoader())

    await waitFor(() => {
      expect(result.current.campaignData).not.toBeNull()
    })

    expect(result.current.campaignData?.name).toBe(campaignData.name)
    expect(result.current.campaignData?.emails.length).toBe(1)
  })

  it('transitions from loading to loaded when context data arrives', async () => {
    const mockLoadCampaign = vi.fn().mockResolvedValue(undefined)

    // Set up initial mocks (loading state) BEFORE rendering — vi.mocked() on
    // a hook captures the implementation at render time, not at call time.
    vi.mocked(useCampaign).mockReturnValue({
      campaignName: null,
      landingPageData: null,
      config: null,
      generatedEmails: [],
      isLoading: true,
      currentCampaignId: null,
      loadCampaign: mockLoadCampaign,
    } as any)

    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any)

    vi.mocked(useUrlState).mockReturnValue({
      getCampaignId: vi.fn().mockReturnValue(null),
      cleanupParams: vi.fn(),
    } as any)

    const { result, rerender } = renderHook(() => useCampaignLoader())
    expect(result.current.loadingState).toBe('loading')

    // Swap context to loaded state and re-render the same hook instance.
    vi.mocked(useCampaign).mockReturnValue({
      campaignName: 'Test',
      landingPageData: { url: 'https://example.com', content: '<p>hi</p>', metadata: {} },
      config: { tone: 'friendly', campaignType: 'nurture', days: 3 },
      generatedEmails: [],
      isLoading: false,
      currentCampaignId: 'camp-123',
      loadCampaign: mockLoadCampaign,
    } as any)

    rerender()

    await waitFor(() => {
      expect(result.current.loadingState).toBe('loaded')
    })
  })
})
