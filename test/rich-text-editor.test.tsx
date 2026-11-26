import { describe, it, expect, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { at } from './_helpers/at'

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
    expect(at(onChange.mock.calls, 0)[0]).toContain('Quick note.')
  })

  // An AI edit arrives as an outside change; Cmd+Z must still take it back,
  // and that undo is the user's edit, so it gets saved.
  it('lets the user undo an outside change, and reports the undo', async () => {
    const { container, onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())

    swapTo(DAY_2)
    await waitFor(() => expect(container.textContent).toContain('Book a demo'))
    act(() => {
      getEditor()!.commands.undo()
    })

    expect(container.textContent).toContain('Create your first project')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

// The user can click into the email while a chat request runs. When the AI
// edit lands, the editor is focused, but it must still show the new text;
// otherwise the next keystroke saves the stale text over the AI edit.
describe('RichTextEditor while focused', () => {
  function focus(editor: Editor) {
    vi.spyOn(editor, 'isFocused', 'get').mockReturnValue(true)
  }

  it('shows an outside (AI) change that arrives while focused, without reporting it', async () => {
    const { container, onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())
    const editor = getEditor()!
    focus(editor)
    act(() => {
      editor.commands.setTextSelection(5)
    })

    swapTo(DAY_2)
    await waitFor(() => expect(container.textContent).toContain('Book a demo'))

    expect(container.textContent).not.toContain('Create your first project')
    expect(onChange).not.toHaveBeenCalled()
    const { from } = editor.state.selection
    expect(from).toBeGreaterThan(0)
    expect(from).toBeLessThanOrEqual(editor.state.doc.content.size)
  })

  it('saves the next keystroke on top of the AI text, not the stale text', async () => {
    const { onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())
    const editor = getEditor()!
    focus(editor)

    swapTo(DAY_2)
    await waitFor(() => expect(editor.getText()).toContain('Book a demo'))
    act(() => {
      editor.commands.insertContent('x')
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(at(onChange.mock.calls, 0)[0]).toContain('Book a demo')
    expect(at(onChange.mock.calls, 0)[0]).not.toContain('Create your first project')
  })

  // tiptap-markdown does not round-trip `**[CTA](url)**` verbatim, so the
  // markdown echoed back through the parent differs from DAY_1. That echo is
  // the user's own edit and must not reset the doc or move the cursor.
  it('does not re-apply its own echoed markdown while the user types', async () => {
    const { onChange, swapTo, getEditor } = setup()
    await waitFor(() => expect(getEditor()).not.toBeNull())
    const editor = getEditor()!
    focus(editor)

    act(() => {
      editor.commands.setTextSelection(5)
      editor.commands.insertContent('X')
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    const emitted = at(onChange.mock.calls, 0)[0] as string
    expect(emitted).not.toBe(DAY_1) // the round trip really is unstable
    const docBefore = editor.getJSON()
    const selBefore = editor.state.selection.from
    let transactions = 0
    editor.on('transaction', () => {
      transactions++
    })

    swapTo(emitted)
    await act(async () => {})

    expect(transactions).toBe(0)
    expect(editor.getJSON()).toEqual(docBefore)
    expect(editor.state.selection.from).toBe(selBefore)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
