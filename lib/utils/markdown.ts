export function markdownToHtml(text: string): string {
  let html = text
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">$1</h1>',
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">$1</h2>',
  )
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">$1</h3>',
  )
  // Links: only http(s) targets, so a crafted `javascript:` URL stays plain text.
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)"<>]+)\)/g,
    '<a href="$2" style="color: #c94600; text-decoration: underline;">$1</a>',
  )
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^• (.+)$/gm, '<li style="margin-left: 1.5rem;">$1</li>')
  html = html.replace(
    /(<li[\s\S]*<\/li>)/,
    '<ul style="list-style-type: disc; margin-bottom: 1rem;">$1</ul>',
  )
  html = html.replace(
    /^(?!<[h|u|l])(.*?)$/gm,
    '<p style="margin-bottom: 1rem; line-height: 1.6;">$1</p>',
  )
  return html
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
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  return markdown.trim()
}
