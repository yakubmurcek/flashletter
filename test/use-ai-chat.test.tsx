import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIChat } from '@/lib/hooks/use-ai-chat'

describe('useAIChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with greeting message', () => {
    const { result } = renderHook(() =>
      useAIChat({ campaignContext: undefined, emailContext: undefined })
    )
    expect(result.current.messages[0].role).toBe('assistant')
    expect(result.current.messages[0].content.length).toBeGreaterThan(10)
  })

  it('sets input and handles quick action selection', () => {
    const { result } = renderHook(() =>
      useAIChat({ campaignContext: undefined, emailContext: undefined })
    )
    act(() => {
      result.current.setInput('Hello')
    })
    expect(result.current.input).toBe('Hello')
  })
})
