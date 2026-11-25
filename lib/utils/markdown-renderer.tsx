import { cn } from '@/lib/utils'

export function processInlineFormattingForPreview(
  text: string,
  keyPrefix = '',
): string | (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0

  // One left-to-right scan for bold OR link, so a match consumes its span and
  // nested formatting (`**[CTA](url)**`, `[**CTA**](url)`) is rendered by
  // recursing into the inner text instead of being emitted twice.
  // [\s\S] lets bold span a newline if one survives into the chunk.
  const inlineRegex = /\*\*([\s\S]*?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g

  let match: RegExpExecArray | null
  let idx = 0
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const key = `${keyPrefix}${idx++}`
    if (match[3] === undefined) {
      parts.push(
        <strong
          key={`bold-${key}`}
          className="font-semibold"
        >
          {processInlineFormattingForPreview(match[1], `${key}-`)}
        </strong>,
      )
    } else {
      parts.push(
        <a
          key={`link-${key}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          {processInlineFormattingForPreview(match[2], `${key}-`)}
        </a>,
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export function renderMarkdown(text: string) {
  if (!text) return null

  // Split by newline to handle content line-by-line
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  let currentBlockType: 'paragraph' | 'list' | 'ordered-list' | null = null
  let currentBlockLines: string[] = []

  // Helper to flush valid blocks
  const flushBlock = (keyPrefix: number) => {
    if (currentBlockLines.length === 0) return

    if (currentBlockType === 'list') {
      const listItems = currentBlockLines.map((line, idx) => {
        // Remove list marker
        const content = line.replace(/^[-•*]\s+/, '')
        return <li key={idx}>{processInlineFormattingForPreview(content)}</li>
      })
      elements.push(
        <ul
          key={`list-${keyPrefix}`}
          className="list-disc list-inside space-y-1 mb-4"
        >
          {listItems}
        </ul>,
      )
    } else if (currentBlockType === 'ordered-list') {
      const listItems = currentBlockLines.map((line, idx) => {
        const content = line.replace(/^\d{1,2}[.)]\s+/, '')
        return <li key={idx}>{processInlineFormattingForPreview(content)}</li>
      })
      elements.push(
        <ol
          key={`olist-${keyPrefix}`}
          className="list-decimal list-inside space-y-1 mb-4"
        >
          {listItems}
        </ol>,
      )
    } else if (currentBlockType === 'paragraph') {
      // Join lines with space for standard markdown behavior
      // To support hard breaks, we could check for trailing spaces or just join with space
      const content = currentBlockLines.join(' ')
      if (content.trim()) {
        elements.push(
          <p
            key={`p-${keyPrefix}`}
            className="mb-4 leading-relaxed"
          >
            {processInlineFormattingForPreview(content)}
          </p>,
        )
      }
    }

    currentBlockLines = []
    currentBlockType = null
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Empty lines trigger a block flush/reset
    if (!trimmed) {
      flushBlock(index)
      return
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushBlock(index)
      elements.push(
        <h1
          key={`h1-${index}`}
          className="text-2xl font-bold mb-4"
        >
          {trimmed.slice(2)}
        </h1>,
      )
      return
    }
    if (trimmed.startsWith('## ')) {
      flushBlock(index)
      elements.push(
        <h2
          key={`h2-${index}`}
          className="text-xl font-semibold mb-3"
        >
          {trimmed.slice(3)}
        </h2>,
      )
      return
    }
    if (trimmed.startsWith('### ')) {
      flushBlock(index)
      elements.push(
        <h3
          key={`h3-${index}`}
          className="text-lg font-semibold mb-2"
        >
          {trimmed.slice(4)}
        </h3>,
      )
      return
    }

    // List Items
    if (trimmed.match(/^[-•*]\s/)) {
      if (currentBlockType !== 'list') {
        flushBlock(index)
        currentBlockType = 'list'
      }
      currentBlockLines.push(trimmed)
    } else if (trimmed.match(/^\d{1,2}[.)]\s/)) {
      // Numbered items ("3 subject lines" answers) would otherwise be joined
      // into one run-on paragraph.
      if (currentBlockType !== 'ordered-list') {
        flushBlock(index)
        currentBlockType = 'ordered-list'
      }
      currentBlockLines.push(trimmed)
    } else {
      // Regular text
      if (currentBlockType === 'list' || currentBlockType === 'ordered-list') {
        // If we encounter a non-list line while in a list, close the list
        flushBlock(index)
        currentBlockType = 'paragraph'
      } else if (currentBlockType === null) {
        currentBlockType = 'paragraph'
      }
      currentBlockLines.push(trimmed)
    }
  })

  // Flush any remaining content
  flushBlock(lines.length)

  return elements
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null

  return <div className={cn('text-sm leading-relaxed', className)}>{renderMarkdown(content)}</div>
}
