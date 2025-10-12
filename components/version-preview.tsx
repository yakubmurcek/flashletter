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
 * Render markdown-formatted text
 */
function renderMarkdown(text: string) {
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

    if (paragraph.includes('\n• ') || paragraph.startsWith('• ')) {
      const items = paragraph.split('\n').filter((line) => line.trim())
      return (
        <ul key={i} className="list-disc list-inside space-y-1 mb-4">
          {items.map((item, j) => (
            <li key={j}>{item.replace('• ', '')}</li>
          ))}
        </ul>
      )
    }

    const content = paragraph
    const parts = []
    let lastIndex = 0

    const patterns = []
    const boldRegex = /\*\*(.*?)\*\*/g
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    let match
    while ((match = boldRegex.exec(content)) !== null) {
      patterns.push({
        type: 'bold',
        index: match.index,
        length: match[0].length,
        text: match[1],
      })
    }

    while ((match = linkRegex.exec(content)) !== null) {
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
        parts.push(content.slice(lastIndex, pattern.index))
      }

      if (pattern.type === 'bold') {
        parts.push(
          <strong key={`${i}-${idx}`} className="font-semibold">
            {pattern.text}
          </strong>
        )
      } else if (pattern.type === 'link') {
        parts.push(
          <a
            key={`${i}-${idx}`}
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

export function VersionPreview({
  version,
  onRestore,
  isLatest = false,
}: VersionPreviewProps) {
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
                  <div className="text-foreground">
                    {renderMarkdown(version.content)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
