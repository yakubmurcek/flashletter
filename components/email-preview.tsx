"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Type, AlignLeft, Bold, Italic, List, Heading1, Heading2, Heading3, Palette } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Email {
  id: number
  day: number
  subject: string
  preview: string
  content: string
}

interface EmailPreviewProps {
  email: Email
  onUpdate: (updates: Partial<Email>) => void
}

export function EmailPreview({ email, onUpdate }: EmailPreviewProps) {
  const [editedSubject, setEditedSubject] = useState(email.subject)
  const [editedContent, setEditedContent] = useState(email.content)
  const [hasChanges, setHasChanges] = useState(false)
  const [editorMode, setEditorMode] = useState<"markdown" | "richtext">("markdown")
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const changed = editedSubject !== email.subject || editedContent !== email.content
    setHasChanges(changed)
  }, [editedSubject, editedContent, email.subject, email.content])

  useEffect(() => {
    setEditedSubject(email.subject)
    setEditedContent(email.content)
  }, [email.id, email.subject, email.content])

  useEffect(() => {
    if (editorMode === "richtext" && editorRef.current) {
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
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">$1</h1>')
    html = html.replace(
      /^## (.+)$/gm,
      '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">$1</h2>',
    )
    html = html.replace(
      /^### (.+)$/gm,
      '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">$1</h3>',
    )
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
    html = html.replace(/^• (.+)$/gm, '<li style="margin-left: 1.5rem;">$1</li>')
    html = html.replace(/(<li.*<\/li>)/s, '<ul style="list-style-type: disc; margin-bottom: 1rem;">$1</ul>')
    html = html.replace(/^(?!<[h|u|l])(.*?)$/gm, '<p style="margin-bottom: 1rem; line-height: 1.6;">$1</p>')
    return html
  }

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    markdown = markdown.replace(/<b>(.*?)<\/b>/gi, "**$1**")
    markdown = markdown.replace(/<em>(.*?)<\/em>/gi, "*$1*")
    markdown = markdown.replace(/<i>(.*?)<\/i>/gi, "*$1*")
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
    markdown = markdown.replace(/<\/?ul[^>]*>/gi, "")
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    markdown = markdown.replace(/<[^>]*>/g, "")
    markdown = markdown.replace(/\n{3,}/g, "\n\n")
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
        const markdown = "#".repeat(level) + " " + selectedText
        document.execCommand("insertText", false, markdown)
        if (editorRef.current) {
          setEditedContent(htmlToMarkdown(editorRef.current.innerHTML))
        }
      }
    }
  }

  const applyColor = (color: string) => {
    applyFormat("foreColor", color)
  }

  const colors = [
    { name: "Default", value: "#000000" },
    { name: "Primary", value: "#c2410c" },
    { name: "Accent", value: "#d97706" },
    { name: "Muted", value: "#78716c" },
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#2563eb" },
  ]

  const renderMarkdown = (text: string) => {
    return text.split("\n\n").map((paragraph, i) => {
      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={i} className="text-2xl font-bold mb-4">
            {paragraph.slice(2)}
          </h1>
        )
      }
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={i} className="text-xl font-semibold mb-3">
            {paragraph.slice(3)}
          </h2>
        )
      }
      if (paragraph.startsWith("### ")) {
        return (
          <h3 key={i} className="text-lg font-semibold mb-2">
            {paragraph.slice(4)}
          </h3>
        )
      }

      if (paragraph.includes("\n• ") || paragraph.startsWith("• ")) {
        const items = paragraph.split("\n").filter((line) => line.trim())
        return (
          <ul key={i} className="list-disc list-inside space-y-1 mb-4">
            {items.map((item, j) => (
              <li key={j}>{item.replace("• ", "")}</li>
            ))}
          </ul>
        )
      }

      const content = paragraph
      const boldRegex = /\*\*(.*?)\*\*/g
      const parts = []
      let lastIndex = 0
      let match

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.slice(lastIndex, match.index))
        }
        parts.push(
          <strong key={match.index} className="font-semibold">
            {match[1]}
          </strong>,
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < content.length) {
        parts.push(content.slice(lastIndex))
      }

      return (
        <p key={i} className="mb-4 leading-relaxed">
          {parts.length > 0 ? parts : paragraph}
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
            <p className="text-sm text-muted-foreground">Edit content on the left, see preview on the right</p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <Save className="w-4 h-4" />
            {hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r border-border overflow-y-auto">
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
                className="text-base"
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
                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "markdown" | "richtext")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="markdown" className="text-xs">
                      Markdown
                    </TabsTrigger>
                    <TabsTrigger value="richtext" className="text-xs">
                      Rich Text
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {editorMode === "richtext" && (
                <div className="flex flex-wrap items-center gap-1 p-2 border border-border rounded-md bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormat("bold")}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormat("italic")}
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
                    onClick={() => applyFormat("insertUnorderedList")}
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
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

              {editorMode === "markdown" ? (
                <>
                  <Textarea
                    id="content"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[600px] font-mono text-sm leading-relaxed resize-none"
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
                    style={{ whiteSpace: "pre-wrap" }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the toolbar above to format your text visually
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 bg-card shadow-sm">
                <div className="space-y-6">
                  <div className="border-b border-border pb-4">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Subject</div>
                    <div className="text-xl font-semibold text-foreground">{editedSubject || "No subject"}</div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <div className="text-foreground">{renderMarkdown(editedContent)}</div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <Button className="w-full sm:w-auto">Call to Action</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
