'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
  placeholder?: string
  editable?: boolean
  onEditorCreated?: (editor: Editor) => void
}

export function RichTextEditor({
  content,
  onChange,
  className,
  placeholder = 'Start writing...',
  editable = true,
  onEditorCreated,
}: RichTextEditorProps) {
  // Markdown the editor itself reported through onChange since the last
  // outside change. The parent feeds it back as `content`; tiptap-markdown's
  // round trip is not exact (`**[x](y)**` comes back as `[**x**](y)`), so
  // re-applying that echo would reset the doc and jump the cursor mid-typing.
  // A set, not just the latest value, so a late echo of an older keystroke is
  // still recognised as ours and never reverts newer typing.
  const emittedRef = useRef<Set<string>>(new Set())
  // The last `content` the editor was synced to (the initial one at mount).
  const syncedRef = useRef(content)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Markdown.configure({
        // Disallow raw HTML in Markdown so a paste containing
        // <script>/<img onerror=...>/etc. can't be persisted into an email
        // and re-rendered for someone else (e.g. when collab/sharing ships).
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
        breaks: true,
      }),
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // StarterKit v3 bundles Link; it is configured separately below.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground/50 before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    content,
    editable,
    onCreate: ({ editor }) => {
      onEditorCreated?.(editor)
    },
    editorProps: {
      attributes: {
        class: cn(
          // text-foreground/90 everywhere: Tailwind's default prose body is a cool
          // grey that clashed with the warm list text.
          'prose max-w-none focus:outline-none min-h-[150px] whitespace-pre-wrap text-foreground/90',
          'prose-p:text-foreground/90 prose-li:text-foreground/90 prose-a:text-primary',
          'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
          'prose-strong:font-semibold prose-strong:text-foreground',
          'prose-ul:list-disc prose-ul:pl-6 prose-ul:text-foreground/90',
          'prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-foreground/90',
          'prose-blockquote:border-l-primary/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
          className,
        ),
      },
    },
    onUpdate: ({ editor }) => {
      // Return markdown content
      const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>
      const markdownStorage = storage.markdown
      const markdown = markdownStorage?.getMarkdown
        ? markdownStorage.getMarkdown()
        : editor.getText()
      syncedRef.current = markdown
      emittedRef.current.add(markdown)
      if (emittedRef.current.size > 100) {
        emittedRef.current.delete(emittedRef.current.values().next().value as string)
      }
      onChange(markdown)
    },
  })

  // Apply an outside change (an AI edit, a restore) even while the editor is
  // focused: the user may click into the email while a chat request runs, and
  // the next keystroke must build on the AI text, not save the stale one over
  // it. Only our own echoed markdown is skipped. The change is not the user
  // typing, so it must not echo back through onUpdate (no fake edits). It
  // stays undoable; each email gets its own editor (the preview is keyed by
  // email id), so undo never reaches another email.
  useEffect(() => {
    if (!editor || !content) return
    if (content === syncedRef.current || emittedRef.current.has(content)) return
    const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>
    const markdownStorage = storage.markdown
    const currentContent = markdownStorage?.getMarkdown
      ? markdownStorage.getMarkdown()
      : editor.getText()
    syncedRef.current = content
    emittedRef.current.clear()
    if (content === currentContent) return
    // Keep the cursor where it was as far as the new doc allows
    // (setTextSelection clamps to the doc size). One transaction, so a single
    // undo step and no update event.
    const { from, to } = editor.state.selection
    editor.chain().setContent(content, { emitUpdate: false }).setTextSelection({ from, to }).run()
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <EditorContent editor={editor} />
    </div>
  )
}
