import { describe, it, expect, vi, afterEach } from 'vitest'
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
  const email = EMAILS.find((e) => e.id === selectedId)!
  return (
    <>
      <button onClick={() => setSelectedId(2)}>Open day 2</button>
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
