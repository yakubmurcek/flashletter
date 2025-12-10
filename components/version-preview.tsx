'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw, Info } from 'lucide-react'
import type { EmailVersion } from '@/lib/types'

interface VersionPreviewProps {
  version: EmailVersion
  onRestore: (version: EmailVersion) => void
  isLatest?: boolean
}

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Process inline formatting (bold, links, etc.)
 */
function processInlineFormatting(text: string) {
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
        <strong
          key={`bold-${idx}`}
          className="font-semibold"
        >
          {pattern.text}
        </strong>,
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
        </a>,
      )
    }

    lastIndex = pattern.index + pattern.length
  })

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

/**
 * Render markdown-formatted text
 */
function renderMarkdown(text: string) {
  return text.split('\n\n').map((paragraph, i) => {
    if (paragraph.startsWith('# ')) {
      return (
        <h1
          key={i}
          className="text-2xl font-bold mb-4"
        >
          {paragraph.slice(2)}
        </h1>
      )
    }
    if (paragraph.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="text-xl font-semibold mb-3"
        >
          {paragraph.slice(3)}
        </h2>
      )
    }
    if (paragraph.startsWith('### ')) {
      return (
        <h3
          key={i}
          className="text-lg font-semibold mb-2"
        >
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
          listItems.push(<li key={idx}>{processInlineFormatting(itemText)}</li>)
        } else if (trimmedLine) {
          // It's a non-list line (like a heading before the list)
          nonListLines.push(
            <div
              key={idx}
              className="mb-2"
            >
              {processInlineFormatting(trimmedLine)}
            </div>,
          )
        }
      })

      return (
        <div
          key={i}
          className="mb-4"
        >
          {nonListLines}
          {listItems.length > 0 && <ul className="list-disc list-inside space-y-1">{listItems}</ul>}
        </div>
      )
    }

    return (
      <p
        key={i}
        className="mb-4 leading-relaxed"
      >
        {processInlineFormatting(paragraph)}
      </p>
    )
  })
}

export function VersionPreview({ version, onRestore, isLatest = false }: VersionPreviewProps) {
  // DEBUG: Log what version data we're rendering
  console.log('[VERSION PREVIEW]', {
    versionId: version.id,
    subject: version.subject.substring(0, 50),
    contentPreview: version.content.substring(0, 100),
  })

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 flex-shrink-0">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4" />
              <span className="font-medium">
                Viewing: {isLatest ? 'Latest version' : 'Previous version'}
              </span>
            </div>
            <div className="text-xs">{formatTimestamp(version.timestamp)}</div>
            <div className="text-xs mt-1">{version.changesSummary}</div>
          </div>
          {!isLatest && (
            <Button
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={() => onRestore(version)}
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 bg-card shadow-sm">
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Subject
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {version.subject || 'No subject'}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="text-foreground">{renderMarkdown(version.content)}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
