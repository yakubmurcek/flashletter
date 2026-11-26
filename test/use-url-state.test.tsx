import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { mockReturnPartial } from './_helpers/partial'
import { useUrlState } from '@/lib/hooks/use-url-state'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

import { useRouter, useSearchParams } from 'next/navigation'

describe('useUrlState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for missing campaign ID', () => {
    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getCampaignId()).toBeNull()
  })

  it('validates campaign ID format', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'campaign') return 'camp-123'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('campaign=camp-123'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getCampaignId()).toBe('camp-123')
  })

  it('rejects invalid campaign ID format', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'campaign') return 'camp@123!'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('campaign=camp@123!'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getCampaignId()).toBeNull()
  })

  it('rejects empty campaign ID', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'campaign') return ''
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('campaign='),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getCampaignId()).toBeNull()
  })

  it('returns null for missing email ID', () => {
    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailId()).toBeNull()
  })

  it('validates and parses email ID', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'email') return '5'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('email=5'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailId()).toBe(5)
  })

  it('rejects email ID of 0', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'email') return '0'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('email=0'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailId()).toBeNull()
  })

  it('rejects email ID exceeding limit (>100)', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'email') return '101'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('email=101'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailId()).toBeNull()
  })

  it('rejects non-numeric email ID', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'email') return 'five'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('email=five'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailId()).toBeNull()
  })

  it('getEmailIdWithFallback returns fallback when email ID missing', () => {
    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailIdWithFallback(3)).toBe(3)
  })

  it('getEmailIdWithFallback returns email ID when present', () => {
    const mockGet = vi.fn((key) => {
      if (key === 'email') return '7'
      return null
    })

    mockReturnPartial(useSearchParams, {
      get: mockGet,
      toString: vi.fn().mockReturnValue('email=7'),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(result.current.getEmailIdWithFallback(1)).toBe(7)
  })

  it('setParam updates URL', () => {
    const mockPush = vi.fn()

    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: mockPush,
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setParam('campaign', 'camp-456')
    })

    expect(mockPush).toHaveBeenCalled()
  })

  it('deleteParam removes URL parameter', () => {
    const mockReplace = vi.fn()

    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue('campaign=camp-123'),
      entries: vi.fn().mockReturnValue([['campaign', 'camp-123']]),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: mockReplace,
    })

    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.deleteParam('campaign')
    })

    expect(mockReplace).toHaveBeenCalled()
  })

  it('setMultipleParams with validation rejects invalid campaign ID', () => {
    const mockPush = vi.fn()
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: mockPush,
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setMultipleParams({ campaign: 'camp@invalid!' }, true)
    })

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid campaign ID'))
    consoleSpy.mockRestore()
  })

  it('setMultipleParams with validation rejects invalid email ID', () => {
    const mockPush = vi.fn()
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: mockPush,
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setMultipleParams({ email: '101' }, true)
    })

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid email ID'))
    consoleSpy.mockRestore()
  })

  it('cleanupParams removes non-specified params', () => {
    const mockReplace = vi.fn()

    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue('campaign=camp-123&email=5&other=value'),
      entries: vi.fn().mockReturnValue([
        ['campaign', 'camp-123'],
        ['email', '5'],
        ['other', 'value'],
      ]),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: mockReplace,
    })

    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.cleanupParams(['campaign'])
    })

    expect(mockReplace).toHaveBeenCalled()
  })

  it('exports validation functions', () => {
    mockReturnPartial(useSearchParams, {
      get: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue(''),
    })

    mockReturnPartial(useRouter, {
      push: vi.fn(),
      replace: vi.fn(),
    })

    const { result } = renderHook(() => useUrlState())

    expect(typeof result.current.isValidCampaignId).toBe('function')
    expect(typeof result.current.isValidEmailId).toBe('function')
  })
})
