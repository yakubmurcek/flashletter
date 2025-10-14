import { useRef, useEffect } from 'react'
import { RichTextToolbar } from './rich-text-toolbar'
import { htmlToMarkdown, markdownToHtml } from '@/lib/utils/markdown'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      // Convert markdown to HTML and set as innerHTML
      const html = markdownToHtml(value)
        .replace(/<li[^>]*>(.*?)<\/li>/g, '<li>$1</li>') // Remove ul wrapper for editor
        .replace(/<p[^>]*>/g, '') // Remove p tags for contentEditable
        .replace(/<\/p>/g, '<br>') // Replace p closing with br
      editorRef.current.innerHTML = html || ''
    }
  }, [value])

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      // Convert HTML back to markdown for storage
      const markdown = htmlToMarkdown(html)
      onChange(markdown)
    }
  }

  const applyHeading = (level: number) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      if (selectedText) {
        const markdown = '#'.repeat(level) + ' ' + selectedText
        document.execCommand('insertText', false, markdown)
        if (editorRef.current) {
          const html = editorRef.current.innerHTML
          const convertedMarkdown = htmlToMarkdown(html)
          onChange(convertedMarkdown)
        }
      }
    }
  }

  const applyColor = (color: string) => {
    applyFormat('foreColor', color)
  }

  return (
    <>
      <RichTextToolbar
        onFormat={applyFormat}
        onHeading={applyHeading}
        onColor={applyColor}
      />
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[600px] p-4 border border-border rounded-md bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        onInput={(e) => {
          const html = e.currentTarget.innerHTML
          const markdown = htmlToMarkdown(html)
          onChange(markdown)
        }}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      <p className="text-xs text-muted-foreground mt-2">
        Use the toolbar above to format your text visually
      </p>
    </>
  )
}
