'use client'

import { useEditor, EditorContent } from '@tiptap/react'
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
}

export function RichTextEditor({
  content,
  onChange,
  className,
  placeholder = 'Start writing...',
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[150px]',
          'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
          'prose-p:text-foreground/90 prose-p:leading-relaxed',
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

  return <EditorContent editor={editor} />
}
