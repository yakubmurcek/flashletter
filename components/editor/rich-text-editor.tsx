'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect } from 'react'
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
          'prose max-w-none focus:outline-none min-h-[150px] whitespace-pre-wrap',
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
      if (markdownStorage?.getMarkdown) {
        onChange(markdownStorage.getMarkdown())
      } else {
        onChange(editor.getText())
      }
    },
  })

  // Update content if it changes externally
  useEffect(() => {
    if (editor && content) {
      const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string }>
      const markdownStorage = storage.markdown
      if (markdownStorage?.getMarkdown) {
        const currentContent = markdownStorage.getMarkdown()
        if (content !== currentContent) {
          if (!editor.isFocused) {
            editor.commands.setContent(content)
          }
        }
      } else {
        // Fallback if markdown extension is failing
        const currentContent = editor.getText()
        if (content !== currentContent && !editor.isFocused) {
          editor.commands.setContent(content)
        }
      }
    }
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
