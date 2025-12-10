import React, { ReactElement } from 'react'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    const elements: ReactElement[] = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={key++}
            className="font-semibold text-sm mt-3 mb-2"
          >
            {processInlineFormatting(line.substring(3))}
          </h3>,
        )
      } else if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={key++}
            className="font-medium text-sm mt-2 mb-1"
          >
            {processInlineFormatting(line.substring(4))}
          </h4>,
        )
      } else if (line.match(/^[-*•]\s/)) {
        elements.push(
          <div
            key={key++}
            className="flex gap-2 my-1"
          >
            <span className="text-primary mt-0.5">•</span>
            <span className="flex-1">{processInlineFormatting(line.substring(2))}</span>
          </div>,
        )
      } else if (line.trim() === '') {
        elements.push(
          <div
            key={key++}
            className="h-2"
          />,
        )
      } else {
        elements.push(
          <p
            key={key++}
            className="my-1"
          >
            {processInlineFormatting(line)}
          </p>,
        )
      }
    }

    return elements
  }

  const processInlineFormatting = (text: string) => {
    const parts: (string | ReactElement)[] = []
    let currentIndex = 0
    let key = 0

    const boldRegex = /\*\*(.*?)\*\*/g
    let match

    const positions: Array<{ start: number; end: number; content: string }> = []

    while ((match = boldRegex.exec(text)) !== null) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      })
    }

    positions.forEach((pos) => {
      if (currentIndex < pos.start) {
        parts.push(text.substring(currentIndex, pos.start))
      }
      parts.push(
        <strong
          key={key++}
          className="font-semibold"
        >
          {pos.content}
        </strong>,
      )
      currentIndex = pos.end
    })

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return <div className={cn('text-sm leading-relaxed', className)}>{renderContent(content)}</div>
}
