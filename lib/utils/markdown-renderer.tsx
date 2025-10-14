import React from 'react'

export function processInlineFormattingForPreview(text: string) {
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

export function renderMarkdown(text: string) {
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
