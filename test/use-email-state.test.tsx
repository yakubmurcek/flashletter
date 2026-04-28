import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Email } from '@/lib/types'

const useCampaignMock = vi.fn()
vi.mock('@/lib/campaign-context', () => ({
  useCampaign: () => useCampaignMock(),
}))

const urlStateMock: {
  getEmailId: ReturnType<typeof vi.fn>
  getEmailIdWithFallback: ReturnType<typeof vi.fn>
  setMultipleParams: ReturnType<typeof vi.fn>
  isValidEmailId: ReturnType<typeof vi.fn>
  getCampaignId: ReturnType<typeof vi.fn>
} = {
  getEmailId: vi.fn(),
  getEmailIdWithFallback: vi.fn(),
  setMultipleParams: vi.fn(),
  isValidEmailId: vi.fn(),
  getCampaignId: vi.fn(),
}
vi.mock('@/lib/hooks/use-url-state', () => ({
  useUrlState: () => urlStateMock,
}))

import { useEmailState } from '@/lib/hooks/use-email-state'

const makeEmail = (id: number): Email =>
  ({
    id,
    uuid: `u${id}`,
    day: id,
    subject: `S${id}`,
    preview: `P${id}`,
    content: `C${id}`,
  }) as Email

function setupCampaign(emails: Email[], opts: { isLoading?: boolean } = {}) {
  const updateEmail = vi.fn()
  useCampaignMock.mockReturnValue({
    generatedEmails: emails,
    isLoading: opts.isLoading ?? false,
    updateEmail,
  })
  return updateEmail
}

describe('useEmailState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    urlStateMock.getEmailId.mockReturnValue(null)
    urlStateMock.getEmailIdWithFallback.mockReturnValue(1)
    urlStateMock.setMultipleParams.mockReset()
    urlStateMock.isValidEmailId.mockReturnValue(true)
    urlStateMock.getCampaignId.mockReturnValue(null)
  })

  it('returns empty emails and null selectedEmail when context is empty', () => {
    setupCampaign([])
    const { result } = renderHook(() => useEmailState())
    expect(result.current.emails).toEqual([])
    expect(result.current.selectedEmail).toBeNull()
    expect(result.current.selectedEmailId).toBe(1)
  })

  it('selects email matching selectedEmailId from URL fallback', () => {
    const emails = [makeEmail(1), makeEmail(2), makeEmail(3)]
    setupCampaign(emails)
    urlStateMock.getEmailIdWithFallback.mockReturnValue(2)

    const { result } = renderHook(() => useEmailState())
    expect(result.current.selectedEmailId).toBe(2)
    expect(result.current.selectedEmail?.id).toBe(2)
  })

  it('returns null selectedEmail when ID does not match any email', () => {
    setupCampaign([makeEmail(1)])
    urlStateMock.getEmailIdWithFallback.mockReturnValue(99)
    const { result } = renderHook(() => useEmailState())
    expect(result.current.selectedEmail).toBeNull()
  })

  it('sets default email param when campaign is loaded with emails and url has no email param', () => {
    setupCampaign([makeEmail(1), makeEmail(2)])
    urlStateMock.getCampaignId.mockReturnValue('camp-1')
    urlStateMock.getEmailId.mockReturnValue(null)

    renderHook(() => useEmailState())

    expect(urlStateMock.setMultipleParams).toHaveBeenCalledWith({
      email: '1',
      campaign: 'camp-1',
    })
  })

  it('does NOT set params when isLoading', () => {
    setupCampaign([makeEmail(1)], { isLoading: true })
    urlStateMock.getCampaignId.mockReturnValue('camp-1')
    renderHook(() => useEmailState())
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
  })

  it('does NOT set params when there are no emails', () => {
    setupCampaign([])
    urlStateMock.getCampaignId.mockReturnValue('camp-1')
    renderHook(() => useEmailState())
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
  })

  it('does NOT set params when email id is already in URL', () => {
    setupCampaign([makeEmail(1)])
    urlStateMock.getCampaignId.mockReturnValue('camp-1')
    urlStateMock.getEmailId.mockReturnValue(1)
    renderHook(() => useEmailState())
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
  })

  it('does NOT set params when no campaign id in URL', () => {
    setupCampaign([makeEmail(1)])
    urlStateMock.getCampaignId.mockReturnValue(null)
    renderHook(() => useEmailState())
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
  })

  it('selectEmail rejects invalid IDs without calling setMultipleParams', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCampaign([makeEmail(1)])
    urlStateMock.isValidEmailId.mockReturnValue(false)

    const { result } = renderHook(() => useEmailState())
    act(() => {
      result.current.selectEmail(5)
    })
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('selectEmail is a no-op when the id is already selected', () => {
    setupCampaign([makeEmail(1), makeEmail(2)])
    urlStateMock.getEmailId.mockReturnValue(2)
    urlStateMock.getEmailIdWithFallback.mockReturnValue(2)
    urlStateMock.getCampaignId.mockReturnValue('camp-1')

    const { result } = renderHook(() => useEmailState())
    urlStateMock.setMultipleParams.mockReset()

    act(() => {
      result.current.selectEmail(2)
    })
    expect(urlStateMock.setMultipleParams).not.toHaveBeenCalled()
  })

  it('selectEmail writes new id and preserves campaign id', () => {
    setupCampaign([makeEmail(1), makeEmail(2)])
    urlStateMock.getEmailId.mockReturnValue(1)
    urlStateMock.getEmailIdWithFallback.mockReturnValue(1)
    urlStateMock.getCampaignId.mockReturnValue('camp-9')

    const { result } = renderHook(() => useEmailState())
    urlStateMock.setMultipleParams.mockReset()

    act(() => {
      result.current.selectEmail(2)
    })
    expect(urlStateMock.setMultipleParams).toHaveBeenCalledWith({
      email: '2',
      campaign: 'camp-9',
    })
  })

  it('updateEmail forwards to context updateEmail', () => {
    const ctxUpdate = setupCampaign([makeEmail(1)])
    const { result } = renderHook(() => useEmailState())
    act(() => {
      result.current.updateEmail(1, { subject: 'New' })
    })
    expect(ctxUpdate).toHaveBeenCalledWith(1, { subject: 'New' })
  })
})
