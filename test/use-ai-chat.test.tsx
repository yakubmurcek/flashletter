import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIChat } from '@/lib/hooks/use-ai-chat'

describe('useAIChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with greeting message', () => {
    const { result } = renderHook(() =>
      useAIChat({ campaignContext: undefined, emailContext: undefined }),
    )
    expect(result.current.messages[0].role).toBe('assistant')
    expect(result.current.messages[0].content.length).toBeGreaterThan(10)
  })

  it('sets input and handles quick action selection', () => {
    const { result } = renderHook(() =>
      useAIChat({ campaignContext: undefined, emailContext: undefined }),
    )
    act(() => {
      result.current.setInput('Hello')
    })
    expect(result.current.input).toBe('Hello')
  })

  it('does not call the API before the campaign context has loaded', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { result } = renderHook(() =>
      useAIChat({ campaignContext: undefined, emailContext: undefined }),
    )
    act(() => {
      result.current.setInput('Make it shorter')
    })
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.input).toBe('Make it shorter')
    expect(result.current.messages).toHaveLength(1)
  })

  it('calls the API once an email context is present', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Done', shouldEdit: false }), { status: 200 }),
      )
    const { result } = renderHook(() =>
      useAIChat({ emailContext: { subject: 'Hi', content: 'Body', campaignType: 'nurture' } }),
    )
    act(() => {
      result.current.setInput('Make it shorter')
    })
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
