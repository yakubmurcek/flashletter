import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, act, waitFor } from '@testing-library/react'
import { useState } from 'react'
import type { Email } from '@/lib/types'

// The body editor is a lazily loaded tiptap instance. A textarea stands in
// for it so the test can type in the body and read what it shows.
vi.mock('next/dynamic', async () => {
  const React = await import('react')
  function EditorStub({
    content,
    onChange,
    onEditorCreated,
  }: {
    content: string
    onChange: (v: string) => void
    onEditorCreated?: (e: unknown) => void
  }) {
    const ref = React.useRef(content)
    ref.current = content
    React.useEffect(() => {
      onEditorCreated?.({ getHTML: () => `<p>${ref.current}</p>` })
    }, [])
    return React.createElement('textarea', {
      'aria-label': 'Body',
      value: content,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    })
  }
  return { default: () => EditorStub }
})

import { EmailPreview } from '@/components/email-preview'
import { useChatEditGuard } from '@/lib/hooks/use-ai-chat'

const START: Email = {
  id: 1,
  day: 1,
  subject: 'Old subject',
  preview: 'A quick look inside',
  content: 'Original paragraph.',
}

/** Wires the preview and the chat edit guard the way the editor page does. */
function Page({
  onSave,
  api,
}: {
  onSave: (u: Partial<Email>) => void
  api: {
    setEmail?: (f: (e: Email) => Email) => void
    applyChatEdits?: ReturnType<typeof useChatEditGuard>['applyChatEdits']
  }
}) {
  const [email, setEmail] = useState<Email>(START)
  const guard = useChatEditGuard([email], (_id, edits) => setEmail((e) => ({ ...e, ...edits })))
  api.setEmail = setEmail
  api.applyChatEdits = guard.applyChatEdits
  return (
    <EmailPreview
      email={email}
      onUpdate={(u) => {
        onSave(u)
        setEmail((e) => ({ ...e, ...u }))
      }}
      onDraftChange={(draft) => guard.reportDraft(email.id, draft)}
    />
  )
}

function setup() {
  const onSave = vi.fn()
  const api: Parameters<typeof Page>[0]['api'] = {}
  const view = render(
    <Page
      onSave={onSave}
      api={api}
    />,
  )
  const subject = view.getByLabelText('Subject') as HTMLTextAreaElement
  const body = view.getByLabelText('Body') as HTMLTextAreaElement
  return { ...view, onSave, api, subject, body }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('EmailPreview: an AI edit to one field', () => {
  it('keeps a subject typed while a body-only edit lands, and saves both', () => {
    vi.useFakeTimers()
    const { api, subject, body, onSave } = setup()

    fireEvent.change(subject, { target: { value: 'New sharper subject' } })
    act(() => vi.advanceTimersByTime(400))
    act(() => api.setEmail!((e) => ({ ...e, content: 'Shorter AI rewrite.' })))

    expect(subject.value).toBe('New sharper subject')
    expect(body.value).toBe('Shorter AI rewrite.')

    act(() => vi.advanceTimersByTime(1000))
    expect(onSave).toHaveBeenLastCalledWith({
      subject: 'New sharper subject',
      content: 'Shorter AI rewrite.',
    })
  })

  it('keeps body words typed just before a subject-only edit lands, and saves both', () => {
    vi.useFakeTimers()
    const { api, subject, body, onSave } = setup()

    fireEvent.change(body, { target: { value: 'Original paragraph. Last words.' } })
    act(() => vi.advanceTimersByTime(300))
    act(() => api.setEmail!((e) => ({ ...e, subject: 'AI subject' })))

    expect(subject.value).toBe('AI subject')
    expect(body.value).toBe('Original paragraph. Last words.')

    act(() => vi.advanceTimersByTime(1000))
    expect(onSave).toHaveBeenLastCalledWith({
      subject: 'AI subject',
      content: 'Original paragraph. Last words.',
    })
  })
})

describe('EmailPreview + chat edit guard', () => {
  const basis = { subject: 'Old subject', content: 'Original paragraph.' }

  it('does not overwrite body words typed less than a second before the reply', () => {
    vi.useFakeTimers()
    const { api, body, onSave } = setup()

    fireEvent.change(body, { target: { value: 'Original paragraph. Still typing' } })
    act(() => vi.advanceTimersByTime(200))
    let applied = true
    act(() => {
      applied = api.applyChatEdits!(1, { content: 'Shorter AI rewrite.' }, basis)
    })

    expect(applied).toBe(false)
    expect(body.value).toBe('Original paragraph. Still typing')
    act(() => vi.advanceTimersByTime(1000))
    expect(onSave).toHaveBeenLastCalledWith({
      subject: 'Old subject',
      content: 'Original paragraph. Still typing',
    })
  })

  it('applies the reply when the user did not touch the email', () => {
    const { api, body } = setup()
    let applied = false
    act(() => {
      applied = api.applyChatEdits!(1, { content: 'Shorter AI rewrite.' }, basis)
    })
    expect(applied).toBe(true)
    expect(body.value).toBe('Shorter AI rewrite.')
  })
})

/** Reads a Blob the way a paste target would. */
function blobText(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsText(b)
  })
}

function mockClipboard({
  withClipboardItem = true,
  write = vi.fn(async () => {}),
  writeText = vi.fn(async () => {}),
} = {}) {
  const items: Record<string, Blob>[] = []
  if (withClipboardItem) {
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(data: Record<string, Blob>) {
          items.push(data)
        }
      },
    )
  } else {
    vi.stubGlobal('ClipboardItem', undefined)
  }
  Object.defineProperty(navigator, 'clipboard', {
    value: withClipboardItem ? { write, writeText } : { writeText },
    configurable: true,
  })
  return { items, write, writeText }
}

describe('EmailPreview copy', () => {
  it('copies rich HTML with a hidden preheader, and the source as plain text', async () => {
    const { items, write } = mockClipboard()
    const view = render(
      <EmailPreview
        email={{ ...START, preview: 'Tips & <tricks>' }}
        onUpdate={() => {}}
      />,
    )
    await waitFor(() => expect(view.getByText('Copy HTML').closest('button')!.disabled).toBe(false))
    fireEvent.click(view.getByText('Copy HTML'))
    await waitFor(() => expect(view.getByText('Copied')).toBeTruthy())

    expect(write).toHaveBeenCalledTimes(1)
    expect(Object.keys(items[0]).sort()).toEqual(['text/html', 'text/plain'])
    const html = await blobText(items[0]['text/html'])
    const plain = await blobText(items[0]['text/plain'])
    expect(html).toBe(
      '<div style="display:none;max-height:0;overflow:hidden">Tips &amp; &lt;tricks&gt;</div>' +
        '<p>Original paragraph.</p>',
    )
    expect(plain).toBe(html)
  })

  it('leaves out the preheader when there is no preview text', async () => {
    const { items } = mockClipboard()
    const view = render(
      <EmailPreview
        email={{ ...START, preview: '' }}
        onUpdate={() => {}}
      />,
    )
    await waitFor(() => expect(view.getByText('Copy HTML').closest('button')!.disabled).toBe(false))
    fireEvent.click(view.getByText('Copy HTML'))
    await waitFor(() => expect(view.getByText('Copied')).toBeTruthy())
    expect(await blobText(items[0]['text/html'])).toBe('<p>Original paragraph.</p>')
  })

  it('falls back to plain text where rich copy is not supported', async () => {
    const { writeText } = mockClipboard({ withClipboardItem: false })
    const view = render(
      <EmailPreview
        email={START}
        onUpdate={() => {}}
      />,
    )
    await waitFor(() => expect(view.getByText('Copy HTML').closest('button')!.disabled).toBe(false))
    fireEvent.click(view.getByText('Copy HTML'))
    await waitFor(() => expect(view.getByText('Copied')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(
      '<div style="display:none;max-height:0;overflow:hidden">A quick look inside</div>' +
        '<p>Original paragraph.</p>',
    )
  })

  it('says the copy failed instead of Copied when the browser refuses', async () => {
    mockClipboard({
      write: vi.fn(async () => {
        throw new Error('denied')
      }),
      writeText: vi.fn(async () => {
        throw new Error('denied')
      }),
    })
    const view = render(
      <EmailPreview
        email={START}
        onUpdate={() => {}}
      />,
    )
    await waitFor(() => expect(view.getByText('Copy HTML').closest('button')!.disabled).toBe(false))
    fireEvent.click(view.getByText('Copy HTML'))
    await waitFor(() => expect(view.getByText('Copy failed')).toBeTruthy())
    expect(view.queryByText('Copied')).toBeNull()
  })

  it('copies the subject as typed', async () => {
    const { writeText } = mockClipboard()
    const view = render(
      <EmailPreview
        email={START}
        onUpdate={() => {}}
      />,
    )
    fireEvent.change(view.getByLabelText('Subject'), { target: { value: 'Typed subject' } })
    fireEvent.click(view.getByText('Copy subject'))
    await waitFor(() => expect(view.getByText('Copied')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith('Typed subject')
    expect(view.getByText('Copy HTML')).toBeTruthy()
  })
})
