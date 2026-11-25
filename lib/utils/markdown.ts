const PARAGRAPH_OPEN = '<p style="margin-bottom: 1rem; line-height: 1.6;">'
const LIST_ITEM_OPEN = '<li style="margin-left: 1.5rem;">'
const HEADING_OPEN: Record<number, string> = {
  1: '<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">',
  2: '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">',
  3: '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Runs on already-escaped text, so captured URLs are never escaped twice.
function renderInline(text: string): string {
  let html = text
  // Links: only http(s) and mailto targets, so a crafted `javascript:` URL stays plain text.
  html = html.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g,
    '<a href="$2" style="color: #c94600; text-decoration: underline;">$1</a>',
  )
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return html
}

/**
 * Markdown (as stored by the editor, tiptap-markdown flavour) to email-safe HTML.
 * Text is HTML-escaped first; every line becomes one block so blank lines keep
 * their spacing in the email.
 */
export function markdownToHtml(text: string): string {
  const escaped = escapeHtml(text.replace(/\r\n?/g, '\n'))
    // tiptap-markdown writes a hard break as a backslash at the end of the line.
    .replace(/\\\n/g, '<br>')
    // Backslash-escaped Markdown punctuation is literal text. An entity keeps
    // it away from the list and emphasis rules below.
    .replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, (_, ch: string) => `&#${ch.charCodeAt(0)};`)

  const blocks: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null
  const flushList = () => {
    if (!list) return
    const open =
      list.tag === 'ul'
        ? '<ul style="list-style-type: disc; margin-bottom: 1rem;">'
        : '<ol style="list-style-type: decimal; margin-bottom: 1rem;">'
    blocks.push(`${open}${list.items.join('\n')}</${list.tag}>`)
    list = null
  }
  const addItem = (tag: 'ul' | 'ol', content: string) => {
    if (list && list.tag !== tag) flushList()
    if (!list) list = { tag, items: [] }
    list.items.push(`${LIST_ITEM_OPEN}${renderInline(content)}</li>`)
  }

  for (const line of escaped.split('\n')) {
    const heading = /^(#{1,3}) (.+)$/.exec(line)
    const bullet = /^[-*•] (.+)$/.exec(line)
    const numbered = /^\d+[.)] (.+)$/.exec(line)
    if (bullet) {
      addItem('ul', bullet[1])
    } else if (numbered) {
      addItem('ol', numbered[1])
    } else {
      flushList()
      if (heading) {
        const level = heading[1].length
        blocks.push(`${HEADING_OPEN[level]}${renderInline(heading[2])}</h${level}>`)
      } else {
        blocks.push(`${PARAGRAPH_OPEN}${renderInline(line)}</p>`)
      }
    }
  }
  flushList()
  return blocks.join('\n')
}

export function htmlToMarkdown(html: string): string {
  let markdown = html
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  markdown = markdown.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*')
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
  markdown = markdown.replace(/<\/?ul[^>]*>/gi, '')
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
  markdown = markdown.replace(/<[^>]*>/g, '')
  // A `<` left now belongs to an unclosed tag ("text <script"); real text
  // reaches us as `&lt;`, so dropping it never eats what the user typed.
  markdown = markdown.replace(/</g, '')
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  return markdown.trim()
}
