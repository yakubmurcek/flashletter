import { describe, it, expect, vi, afterEach } from 'vitest'
import { must } from './_helpers/must'
import { render, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import type { Email } from '@/lib/types'

// The body editor is a lazily loaded tiptap instance; the subject field is
// enough to drive the autosave debounce.
vi.mock('next/dynamic', () => ({
  default: () =>
    function EditorStub() {
      return null
    },
}))

import { EmailPreview } from '@/components/email-preview'

const EMAILS: Email[] = [
  { id: 1, day: 1, subject: 'Day one', preview: '', content: 'Body one' },
  { id: 2, day: 2, subject: 'Day two', preview: '', content: 'Body two' },
]

/** Renders the preview the way the editor page does. */
function EditorHarness({ onSave }: { onSave: (id: number, updates: Partial<Email>) => void }) {
  const [selectedId, setSelectedId] = useState(1)
  const email = must(EMAILS.find((e) => e.id === selectedId))
  return (
    <>
      <button
        type="button"
        onClick={() => setSelectedId(2)}
      >
        Open day 2
      </button>
      <EmailPreview
        key={email.id}
        email={email}
        onUpdate={(updates) => onSave(email.id, updates)}
      />
    </>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('EmailPreview autosave', () => {
  // The editor shows a "couldn't save" banner; the header must not say Saved next to it.
  it('says Not saved when the last save failed', () => {
    const { getByText, queryByText } = render(
      <EmailPreview
        email={EMAILS[0]}
        onUpdate={() => {}}
        saveFailed
      />,
    )
    expect(getByText('Not saved')).toBeTruthy()
    expect(queryByText('Saved')).toBeNull()
  })

  it('saves an edit after the debounce', () => {
    vi.useFakeTimers()
    const onSave = vi.fn()
    const { getByLabelText } = render(<EditorHarness onSave={onSave} />)

    fireEvent.change(getByLabelText('Subject'), { target: { value: 'Sharper day one' } })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).toHaveBeenCalledWith(1, { subject: 'Sharper day one', content: 'Body one' })
  })

  it('keeps an edit typed just before switching to another email', () => {
    vi.useFakeTimers()
    const onSave = vi.fn()
    const { getByLabelText, getByText } = render(<EditorHarness onSave={onSave} />)

    fireEvent.change(getByLabelText('Subject'), { target: { value: 'Sharper day one' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(getByText('Open day 2'))
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).toHaveBeenCalledWith(1, { subject: 'Sharper day one', content: 'Body one' })
    expect(onSave).not.toHaveBeenCalledWith(2, expect.anything())
    expect((getByLabelText('Subject') as HTMLTextAreaElement).value).toBe('Day two')
  })
})

describe('EmailPreview save status and tab close', () => {
  it('says Saving while an edit waits out the debounce, not Saved', () => {
    vi.useFakeTimers()
    const { getByLabelText, getByText, queryByText } = render(<EditorHarness onSave={vi.fn()} />)

    fireEvent.change(getByLabelText('Subject'), { target: { value: 'Not yet saved' } })
    expect(getByText('Saving...')).toBeTruthy()
    expect(queryByText('Saved')).toBeNull()
  })

  it('hands a pending edit to autosave when the tab is closed', () => {
    vi.useFakeTimers()
    const onSave = vi.fn()
    const { getByLabelText } = render(<EditorHarness onSave={onSave} />)

    fireEvent.change(getByLabelText('Subject'), { target: { value: 'Last words' } })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(onSave).toHaveBeenCalledWith(1, { subject: 'Last words', content: 'Body one' })
  })
})
