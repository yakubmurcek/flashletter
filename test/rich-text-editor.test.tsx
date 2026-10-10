import { describe, it, expect, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { RichTextEditor } from '@/components/editor/rich-text-editor'

// Generated emails often bold the CTA link and put the sign-off under a
// one-line closing; neither survives tiptap-markdown's round trip verbatim.
const DAY_1 =
  'Hi there,\n\n**[Create your first project](https://acme.com/start)**\n\nCheers,\nThe Acme team'
const DAY_2 =
  'Hello again,\n\n**[Book a demo](https://acme.com/demo)**\n\nTalk soon,\nThe Acme team'

function setup() {
  const onChange = vi.fn()
  let editor: Editor | null = null
  const props = {
    onChange,
    onEditorCreated: (e: Editor) => {
      editor = e
    },
  }
  const view = render(
    <RichTextEditor
      content={DAY_1}
      {...props}
    />,
  )
  const swapTo = (content: string) =>
    view.rerender(
      <RichTextEditor
        content={content}
        {...props}
      />,
    )
  return { ...view, onChange, swapTo, getEditor: () => editor as Editor | null }
}

describe('RichTextEditor external content changes', () => {
  it('does not report a content swap (switching emails) as a user edit', async () => {
    const { container, onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())

    swapTo(DAY_2)
    await waitFor(() => expect(container.textContent).toContain('Book a demo'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('still reports what the user types', async () => {
    const { onChange, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())

    act(() => {
      getEditor()!.commands.insertContent('Quick note. ')
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toContain('Quick note.')
  })

  it('cannot undo back into the previous email after switching', async () => {
    const { container, onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())
    act(() => {
      getEditor()!.commands.insertContent('Typed in day one. ')
    })
    onChange.mockClear()

    swapTo(DAY_2)
    await waitFor(() => expect(container.textContent).toContain('Book a demo'))
    act(() => {
      getEditor()!.commands.undo()
    })

    expect(container.textContent).toContain('Book a demo')
    expect(container.textContent).not.toContain('Create your first project')
    expect(onChange).not.toHaveBeenCalled()
  })
})
