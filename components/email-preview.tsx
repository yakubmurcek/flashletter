"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Save, Type, AlignLeft } from "lucide-react"

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

  useEffect(() => {
    const changed = editedSubject !== email.subject || editedContent !== email.content
    setHasChanges(changed)
  }, [editedSubject, editedContent, email.subject, email.content])

  useEffect(() => {
    setEditedSubject(email.subject)
    setEditedContent(email.content)
  }, [email.id, email.subject, email.content])

  const handleSave = () => {
    onUpdate({
      subject: editedSubject,
      content: editedContent,
    })
    setHasChanges(false)
  }

  const renderMarkdown = (text: string) => {
    return text.split("\n\n").map((paragraph, i) => {
      // Headers
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

      // Bullet lists
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

      // Bold text
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

      // Regular paragraph
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
        {/* Editor Pane */}
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
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="content" className="text-sm font-medium">
                  Email Content (Markdown)
                </Label>
              </div>
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
            </div>
          </div>
        </div>

        {/* Preview Pane */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 bg-card shadow-sm">
                <div className="space-y-6">
                  {/* Subject Preview */}
                  <div className="border-b border-border pb-4">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Subject</div>
                    <div className="text-xl font-semibold text-foreground">{editedSubject || "No subject"}</div>
                  </div>

                  {/* Content Preview */}
                  <div className="prose prose-sm max-w-none">
                    <div className="text-foreground">{renderMarkdown(editedContent)}</div>
                  </div>

                  {/* CTA Preview */}
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
