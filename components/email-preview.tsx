'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Save,
  Type,
  AlignLeft,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Heading3,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { TextSelectionPopup } from './text-selection-popup'

interface Email {
  id: number
  uuid?: string
  day: number
  subject: string
  preview: string
  content: string
}

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
  onTextSelected?: (text: string, action: string) => void
}

export function EmailPreview({
  email,
  onUpdate,
  onTextSelected,
}: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject)
  const [editedContent, setEditedContent] = useState(email.content)
  const [hasChanges, setHasChanges] = useState(false)
  const [editorMode, setEditorMode] = useState<'markdown' | 'richtext'>(
    'markdown'
  )
  const [showEditor, setShowEditor] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [popupPosition, setPopupPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const changed =
      editedSubject !== email.subject || editedContent !== email.content
    setHasChanges(changed)
  }, [editedSubject, editedContent, email.subject, email.content])

  useEffect(() => {
    setEditedSubject(email.subject)
    setEditedContent(email.content)
  }, [email.id, email.subject, email.content])

  useEffect(() => {
    if (editorMode === 'richtext' && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(editedContent)
    }
  }, [editorMode, editedContent])

  const handleSave = () => {
    onUpdate({
      subject: editedSubject,
      content: editedContent,
    })
    setHasChanges(false)
  }

  const markdownToHtml = (text: string): string => {
    let html = text
    html = html.replace(
      /^# (.+)$/gm,
      '<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">$1</h1>'
    )
    html = html.replace(
      /^## (.+)$/gm,
      '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">$1</h2>'
    )
    html = html.replace(
      /^### (.+)$/gm,
      '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">$1</h3>'
    )
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(
      /^• (.+)$/gm,
      '<li style="margin-left: 1.5rem;">$1</li>'
    )
    html = html.replace(
      /(<li[\s\S]*<\/li>)/,
      '<ul style="list-style-type: disc; margin-bottom: 1rem;">$1</ul>'
    )
    html = html.replace(
      /^(?!<[h|u|l])(.*?)$/gm,
      '<p style="margin-bottom: 1rem; line-height: 1.6;">$1</p>'
    )
    return html
  }

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**')
    markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*')
    markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*')
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    markdown = markdown.replace(/<\/?ul[^>]*>/gi, '')
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    markdown = markdown.replace(/<[^>]*>/g, '')
    markdown = markdown.replace(/\n{3,}/g, '\n\n')
    return markdown.trim()
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      setEditedContent(htmlToMarkdown(html))
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
          setEditedContent(htmlToMarkdown(editorRef.current.innerHTML))
        }
      }
    }
  }

  const applyColor = (color: string) => {
    applyFormat('foreColor', color)
  }

  const colors = [
    { name: 'Default', value: '#000000' },
    { name: 'Primary', value: '#c2410c' },
    { name: 'Accent', value: '#d97706' },
    { name: 'Muted', value: '#78716c' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Blue', value: '#2563eb' },
  ]

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length > 0) {
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()

      if (rect) {
        setSelectedText(text)
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY,
        })
      }
    } else {
      setSelectedText('')
      setPopupPosition(null)
    }
  }

  const handleActionSelected = (action: string, text: string) => {
    if (onTextSelected) {
      onTextSelected(text, action)
    }
    setSelectedText('')
    setPopupPosition(null)
  }

  const handleClosePopup = () => {
    setSelectedText('')
    setPopupPosition(null)
  }

  const processInlineFormattingForPreview = (text: string) => {
    const parts: (string | React.ReactElement)[] = []
    let lastIndex = 0

    const patterns: Array<{
      type: string
      index: number
      length: number
      text: string
      url?: string
    }> = []

    const boldRegex = /\*\*(.*?)\*\*/g
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    let match
    while ((match = boldRegex.exec(text)) !== null) {
      patterns.push({
        type: 'bold',
        index: match.index,
        length: match[0].length,
        text: match[1],
      })
    }

    while ((match = linkRegex.exec(text)) !== null) {
      patterns.push({
        type: 'link',
        index: match.index,
        length: match[0].length,
        text: match[1],
        url: match[2],
      })
    }

    patterns.sort((a, b) => a.index - b.index)

    patterns.forEach((pattern, idx) => {
      if (pattern.index > lastIndex) {
        parts.push(text.slice(lastIndex, pattern.index))
      }

      if (pattern.type === 'bold') {
        parts.push(
          <strong key={`bold-${idx}`} className="font-semibold">
            {pattern.text}
          </strong>
        )
      } else if (pattern.type === 'link') {
        parts.push(
          <a
            key={`link-${idx}`}
            href={pattern.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 transition-colors"
          >
            {pattern.text}
          </a>
        )
      }

      lastIndex = pattern.index + pattern.length
    })

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n\n').map((paragraph, i) => {
      if (paragraph.startsWith('# ')) {
        return (
          <h1 key={i} className="text-2xl font-bold mb-4">
            {paragraph.slice(2)}
          </h1>
        )
      }
      if (paragraph.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-semibold mb-3">
            {paragraph.slice(3)}
          </h2>
        )
      }
      if (paragraph.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-semibold mb-2">
            {paragraph.slice(4)}
          </h3>
        )
      }

      // Check for bullet lists (with • or - or *)
      if (
        paragraph.includes('\n• ') ||
        paragraph.startsWith('• ') ||
        paragraph.includes('\n- ') ||
        paragraph.startsWith('- ') ||
        paragraph.includes('\n* ') ||
        paragraph.startsWith('* ')
      ) {
        const lines = paragraph.split('\n')
        const listItems: React.ReactElement[] = []
        const nonListLines: React.ReactElement[] = []

        lines.forEach((line, idx) => {
          const trimmedLine = line.trim()
          if (trimmedLine.match(/^[-•*]\s/)) {
            // It's a list item
            const itemText = trimmedLine.substring(2).trim()
            listItems.push(
              <li key={idx}>{processInlineFormattingForPreview(itemText)}</li>
            )
          } else if (trimmedLine) {
            // It's a non-list line (like a heading before the list)
            nonListLines.push(
              <div key={idx} className="mb-2">
                {processInlineFormattingForPreview(trimmedLine)}
              </div>
            )
          }
        })

        return (
          <div key={i} className="mb-4">
            {nonListLines}
            {listItems.length > 0 && (
              <ul className="list-disc list-inside space-y-1">{listItems}</ul>
            )}
          </div>
        )
      }

      return (
        <p key={i} className="mb-4 leading-relaxed">
          {processInlineFormattingForPreview(paragraph)}
        </p>
      )
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Day {email.day}</h2>
            <p className="text-sm text-muted-foreground">
              {showEditor
                ? 'Edit content on the left, see preview on the right'
                : 'Preview mode - click to show editor'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(!showEditor)}
              className="gap-2"
            >
              {showEditor ? (
                <>
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Editor</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Editor</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            'border-r border-border overflow-y-auto transition-all duration-300',
            showEditor ? 'flex-1' : 'w-0 border-r-0 overflow-hidden'
          )}
        >
          {showEditor && (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Subject Line
                  </Label>
                </div>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="text-base bg-card border-border"
                  placeholder="Enter email subject..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="content" className="text-sm font-medium">
                      Email Content
                    </Label>
                  </div>
                  <div className="relative">
                    <Tabs
                      value={editorMode}
                      onValueChange={(v) =>
                        setEditorMode(v as 'markdown' | 'richtext')
                      }
                    >
                      <TabsList className="h-8">
                        <TabsTrigger value="markdown" className="text-xs">
                          Markdown
                        </TabsTrigger>
                        <TabsTrigger
                          value="richtext"
                          className="text-xs"
                          disabled
                        >
                          Rich Text
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-medium bg-primary/90 text-white rounded-sm rotate-12 pointer-events-none shadow-sm">
                      Soon
                    </span>
                  </div>
                </div>

                {editorMode === 'richtext' && (
                  <div className="flex flex-wrap items-center gap-1 p-2 border border-border rounded-md bg-muted/30">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyFormat('bold')}
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyFormat('italic')}
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyHeading(1)}
                      title="Heading 1"
                    >
                      <Heading1 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyHeading(2)}
                      title="Heading 2"
                    >
                      <Heading2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyHeading(3)}
                      title="Heading 3"
                    >
                      <Heading3 className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => applyFormat('insertUnorderedList')}
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Text Color"
                        >
                          <Palette className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2">
                        <div className="grid grid-cols-3 gap-2">
                          {colors.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className="h-8 rounded border border-border hover:scale-110 transition-transform"
                              style={{ backgroundColor: color.value }}
                              onClick={() => applyColor(color.value)}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {editorMode === 'markdown' ? (
                  <>
                    <Textarea
                      id="content"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[600px] font-mono text-sm leading-relaxed resize-none bg-card border-border"
                      placeholder="Write your email content here using markdown...

# Heading 1
## Heading 2
### Heading 3

**Bold text**

• Bullet point 1
• Bullet point 2

Regular paragraph text..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Tip: Use **bold**, # for headings, and • for bullet points
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      ref={editorRef}
                      contentEditable
                      className="min-h-[600px] p-4 border border-border rounded-md bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                      onInput={(e) => {
                        const html = e.currentTarget.innerHTML
                        setEditedContent(htmlToMarkdown(html))
                      }}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Use the toolbar above to format your text visually
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6" onMouseUp={handleTextSelection}>
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 bg-card shadow-sm">
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                      Subject
                    </div>
                    <div className="text-xl font-semibold text-foreground">
                      {editedSubject || 'No subject'}
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <div className="text-foreground">
                      {renderMarkdown(editedContent)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {selectedText && popupPosition && (
        <TextSelectionPopup
          selectedText={selectedText}
          position={popupPosition}
          onAction={handleActionSelected}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}
