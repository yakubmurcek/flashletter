import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIChat, useChatEditGuard, type EmailEdits } from '@/lib/hooks/use-ai-chat'
import type { FullCampaignContext, Email } from '@/lib/types'

const ORIGINAL = { subject: 'Old subject', content: 'Original paragraph.', campaignType: 'welcome' }
const AI_EDITS: EmailEdits = { content: 'Shorter AI rewrite.' }

type Params = Parameters<typeof useAIChat>[0]

/** A chat reply the test releases by hand, so the email can change meanwhile. */
function deferredFetch(body: unknown) {
  let release: () => void = () => {}
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        release = () => resolve(new Response(JSON.stringify(body), { status: 200 }))
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return { release: () => release(), fetchMock }
}

function campaignFor(id: number) {
  return { currentEmailId: id } as unknown as FullCampaignContext
}

async function sendAndHoldReply(params: Params) {
  const reply = deferredFetch({ message: 'I made it shorter.', shouldEdit: true, edits: AI_EDITS })
  const hook = renderHook((p: Params) => useAIChat(p), { initialProps: params })
  act(() => hook.result.current.setInput('Make it shorter'))
  let pending: Promise<void> = Promise.resolve()
  act(() => {
    pending = hook.result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
  })
  const land = async () => {
    await act(async () => {
      reply.release()
      await pending
    })
  }
  return { ...hook, land }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAIChat edit that lands after the email changed', () => {
  it('applies the edit as before when the email is unchanged', async () => {
    const onApplyEdits = vi.fn()
    const { result, land } = await sendAndHoldReply({ emailContext: ORIGINAL, onApplyEdits })
    await land()

    expect(onApplyEdits).toHaveBeenCalledTimes(1)
    expect(onApplyEdits).toHaveBeenCalledWith(AI_EDITS, {
      subject: ORIGINAL.subject,
      content: ORIGINAL.content,
    })
    const last = result.current.messages.at(-1)!
    expect(last.appliedEdit).toBe(true)
    expect(last.proposedEdit).toBeUndefined()
  })

  it('keeps what the user typed while waiting and offers the AI version instead', async () => {
    const onApplyEdits = vi.fn()
    const { result, rerender, land } = await sendAndHoldReply({
      emailContext: ORIGINAL,
      onApplyEdits,
    })
    // The user kept typing; the autosave pushed it up to the page.
    rerender({
      emailContext: { ...ORIGINAL, content: 'Original paragraph. Typed while waiting.' },
      onApplyEdits,
    })
    await land()

    expect(onApplyEdits).not.toHaveBeenCalled()
    const last = result.current.messages.at(-1)!
    expect(last.appliedEdit).toBe(false)
    expect(last.proposedEdit).toEqual(AI_EDITS)
    expect(last.applyProposedEdit).toBeTypeOf('function')

    const apply = last.applyProposedEdit!
    act(() => apply())
    expect(onApplyEdits).toHaveBeenCalledTimes(1)
    expect(onApplyEdits).toHaveBeenCalledWith(AI_EDITS)
    const after = result.current.messages.at(-1)!
    expect(after.appliedEdit).toBe(true)
    expect(after.applyProposedEdit).toBeUndefined()

    // A second click on a stale button does nothing.
    act(() => apply())
    expect(onApplyEdits).toHaveBeenCalledTimes(1)
  })

  it('offers the AI version when the page reports unsaved typing', async () => {
    const onApplyEdits = vi.fn(() => false)
    const { result, land } = await sendAndHoldReply({ emailContext: ORIGINAL, onApplyEdits })
    await land()

    expect(onApplyEdits).toHaveBeenCalledTimes(1)
    const last = result.current.messages.at(-1)!
    expect(last.appliedEdit).toBe(false)
    expect(last.proposedEdit).toEqual(AI_EDITS)
  })

  it('leaves the decision to the page when the user switched to another email', async () => {
    const onApplyEdits = vi.fn(() => true)
    const { result, rerender, land } = await sendAndHoldReply({
      campaignContext: campaignFor(1),
      emailContext: ORIGINAL,
      onApplyEdits,
    })
    rerender({
      campaignContext: campaignFor(2),
      emailContext: { subject: 'Day two', content: 'Body two', campaignType: 'welcome' },
      onApplyEdits,
    })
    await land()

    expect(onApplyEdits).toHaveBeenCalledWith(AI_EDITS, {
      subject: ORIGINAL.subject,
      content: ORIGINAL.content,
    })
    expect(result.current.messages.at(-1)!.appliedEdit).toBe(true)
  })
})

describe('useChatEditGuard', () => {
  const EMAILS: Email[] = [
    { id: 1, day: 1, subject: 'Old subject', preview: '', content: 'Original paragraph.' },
    { id: 2, day: 2, subject: 'Day two', preview: '', content: 'Body two' },
  ]
  const basis = { subject: 'Old subject', content: 'Original paragraph.' }

  it('applies to the target email when nothing changed', () => {
    const applyEdit = vi.fn()
    const { result } = renderHook(() => useChatEditGuard(EMAILS, applyEdit))
    expect(result.current.applyChatEdits(1, AI_EDITS, basis)).toBe(true)
    expect(applyEdit).toHaveBeenCalledWith(1, AI_EDITS)
  })

  it('refuses when the open email holds typing not saved yet', () => {
    const applyEdit = vi.fn()
    const { result } = renderHook(() => useChatEditGuard(EMAILS, applyEdit))
    act(() =>
      result.current.reportDraft(1, {
        subject: 'Old subject',
        content: 'Original paragraph. Last words.',
      }),
    )
    expect(result.current.applyChatEdits(1, AI_EDITS, basis)).toBe(false)
    expect(applyEdit).not.toHaveBeenCalled()
  })

  it('checks the email the request was about, not the open one', () => {
    const applyEdit = vi.fn()
    const { result } = renderHook(() => useChatEditGuard(EMAILS, applyEdit))
    act(() => result.current.reportDraft(2, { subject: 'Day two', content: 'Body two typed' }))
    expect(result.current.applyChatEdits(1, AI_EDITS, basis)).toBe(true)
    expect(applyEdit).toHaveBeenCalledWith(1, AI_EDITS)
  })

  it('applies without a check when the user chose Apply anyway', () => {
    const applyEdit = vi.fn()
    const { result } = renderHook(() => useChatEditGuard(EMAILS, applyEdit))
    act(() => result.current.reportDraft(1, { subject: 'Changed', content: 'Changed' }))
    expect(result.current.applyChatEdits(1, AI_EDITS)).toBe(true)
    expect(applyEdit).toHaveBeenCalledWith(1, AI_EDITS)
  })
})

describe('AIChatMessageList held-back edit', () => {
  it('shows the AI version with an Apply anyway button', async () => {
    const { render, fireEvent } = await import('@testing-library/react')
    const { AIChatMessageList } = await import('@/components/ai-chat/message-list')
    const apply = vi.fn()
    // jsdom has no layout, so no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn()
    const view = render(
      <AIChatMessageList
        isLoading={false}
        messages={[
          {
            id: 2,
            role: 'assistant',
            content: 'I made it shorter.',
            timestamp: new Date(),
            appliedEdit: false,
            proposedEdit: { subject: 'AI subject', content: 'Shorter AI rewrite.' },
            applyProposedEdit: apply,
          },
        ]}
      />,
    )
    expect(view.getByText('Shorter AI rewrite.')).toBeTruthy()
    expect(view.getByText('AI subject')).toBeTruthy()
    fireEvent.click(view.getByText('Apply anyway'))
    expect(apply).toHaveBeenCalledTimes(1)
  })
})
