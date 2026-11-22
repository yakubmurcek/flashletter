import { describe, it, expect } from 'vitest'
import { markdownToHtml, htmlToMarkdown } from '@/lib/utils/markdown'

describe('markdownToHtml', () => {
  it('converts h1 heading', () => {
    const result = markdownToHtml('# Hello')
    expect(result).toContain('<h1')
    expect(result).toContain('Hello')
    expect(result).toContain('</h1>')
  })

  it('converts h2 heading', () => {
    const result = markdownToHtml('## Section')
    expect(result).toContain('<h2')
    expect(result).toContain('Section')
    expect(result).toContain('</h2>')
  })

  it('converts h3 heading', () => {
    const result = markdownToHtml('### Subsection')
    expect(result).toContain('<h3')
    expect(result).toContain('Subsection')
    expect(result).toContain('</h3>')
  })

  it('converts bold text', () => {
    const result = markdownToHtml('**bold**')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('converts italic text', () => {
    const result = markdownToHtml('*italic*')
    expect(result).toContain('<em>italic</em>')
  })

  it('converts bullet list items', () => {
    const result = markdownToHtml('• Item 1\n• Item 2')
    expect(result).toContain('<li')
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
  })

  it('wraps list items in ul', () => {
    const result = markdownToHtml('• Item 1')
    expect(result).toContain('<ul')
    expect(result).toContain('</ul>')
  })

  it('wraps paragraphs in p tags', () => {
    const result = markdownToHtml('This is a paragraph')
    expect(result).toContain('<p')
    expect(result).toContain('This is a paragraph')
    expect(result).toContain('</p>')
  })

  it('preserves line breaks between paragraphs', () => {
    const result = markdownToHtml('Para 1\n\nPara 2')
    expect(result).toContain('Para 1')
    expect(result).toContain('Para 2')
  })

  it('combines multiple transformations', () => {
    const markdown = '# Title\n\n**Bold** and *italic*\n\n• Point 1'
    const result = markdownToHtml(markdown)
    expect(result).toContain('<h1')
    expect(result).toContain('<strong>Bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<li')
  })

  it('adds styling to headers', () => {
    const result = markdownToHtml('# Header')
    expect(result).toContain('style=')
    expect(result).toContain('font-size')
    expect(result).toContain('font-weight')
  })
})

describe('htmlToMarkdown', () => {
  it('converts h1 to markdown', () => {
    const result = htmlToMarkdown('<h1>Title</h1>')
    expect(result).toContain('# Title')
  })

  it('converts h2 to markdown', () => {
    const result = htmlToMarkdown('<h2>Section</h2>')
    expect(result).toContain('## Section')
  })

  it('converts h3 to markdown', () => {
    const result = htmlToMarkdown('<h3>Subsection</h3>')
    expect(result).toContain('### Subsection')
  })

  it('converts strong to bold', () => {
    const result = htmlToMarkdown('<strong>bold</strong>')
    expect(result).toContain('**bold**')
  })

  it('converts b to bold', () => {
    const result = htmlToMarkdown('<b>bold</b>')
    expect(result).toContain('**bold**')
  })

  it('converts em to italic', () => {
    const result = htmlToMarkdown('<em>italic</em>')
    expect(result).toContain('*italic*')
  })

  it('converts i to italic', () => {
    const result = htmlToMarkdown('<i>italic</i>')
    expect(result).toContain('*italic*')
  })

  it('converts li to bullet point', () => {
    const result = htmlToMarkdown('<li>Item</li>')
    expect(result).toContain('• Item')
  })

  it('removes ul tags', () => {
    const result = htmlToMarkdown('<ul><li>Item</li></ul>')
    expect(result).not.toContain('<ul')
    expect(result).not.toContain('</ul>')
    expect(result).toContain('• Item')
  })

  it('converts p to paragraph', () => {
    const result = htmlToMarkdown('<p>Paragraph</p>')
    expect(result).toContain('Paragraph')
  })

  it('removes generic HTML tags', () => {
    const result = htmlToMarkdown('<span>Text</span>')
    expect(result).toContain('Text')
    expect(result).not.toContain('<span')
  })

  it('removes all style and class attributes', () => {
    const result = htmlToMarkdown('<p style="color: red;" class="text">Content</p>')
    expect(result).toContain('Content')
    expect(result).not.toContain('style')
    expect(result).not.toContain('class')
  })

  it('combines multiple transformations', () => {
    const html =
      '<h1>Title</h1><p><strong>Bold</strong> and <em>italic</em></p><ul><li>Point</li></ul>'
    const result = htmlToMarkdown(html)
    expect(result).toContain('# Title')
    expect(result).toContain('**Bold**')
    expect(result).toContain('*italic*')
    expect(result).toContain('• Point')
  })

  it('collapses multiple newlines', () => {
    const html = '<p>Para</p>\n\n\n<p>Other</p>'
    const result = htmlToMarkdown(html)
    const newlines = (result.match(/\n/g) || []).length
    expect(newlines).toBeLessThanOrEqual(3) // Should collapse excessive newlines
  })

  it('trims result', () => {
    const html = '\n\n<p>Content</p>\n\n'
    const result = htmlToMarkdown(html)
    expect(result).toBe(result.trim())
  })
})

describe('roundtrip conversion', () => {
  it('markdown -> html -> markdown preserves basic structure', () => {
    const original = '# Title\n\n**Bold**'
    const html = markdownToHtml(original)
    const back = htmlToMarkdown(html)
    // Check that key elements are preserved
    expect(back).toContain('# Title')
    expect(back).toContain('**Bold**')
  })

  it('handles empty string', () => {
    // Source wraps any non-heading line in a <p>; empty input becomes a single
    // empty paragraph rather than '' — intentional, see lib/utils/markdown.ts.
    expect(markdownToHtml('')).toBe('<p style="margin-bottom: 1rem; line-height: 1.6;"></p>')
    expect(htmlToMarkdown('')).toBe('')
  })
})

describe('markdown links', () => {
  it('turns http(s) Markdown links into anchors', () => {
    const html = markdownToHtml('[Start your trial](https://e.com/start)')
    expect(html).toContain('<a href="https://e.com/start"')
    expect(html).toContain('>Start your trial</a>')
  })

  it('leaves non-http links as text', () => {
    const html = markdownToHtml('[x](javascript:alert(1))')
    expect(html).not.toContain('<a ')
  })

  it('round-trips anchors back to Markdown', () => {
    expect(htmlToMarkdown('<p><a href="https://e.com">Go</a></p>')).toBe('[Go](https://e.com)')
  })
})

describe('markdownToHtml escaping and email-safe output', () => {
  it('escapes raw HTML so a <script> in the body stays text', () => {
    const html = markdownToHtml('Hi <script>alert(1)</script> & bye')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; bye')
  })

  it('escapes a lone < and quotes', () => {
    const html = markdownToHtml('a < b and "c"')
    expect(html).toContain('a &lt; b and &quot;c&quot;')
  })

  it('does not double-escape an & inside a link URL', () => {
    const html = markdownToHtml('[Go](https://e.com/?a=1&b=2)')
    expect(html).toContain('href="https://e.com/?a=1&amp;b=2"')
    expect(html).not.toContain('&amp;amp;')
  })

  it('allows mailto links', () => {
    const html = markdownToHtml('[Write us](mailto:hi@e.com)')
    expect(html).toContain('<a href="mailto:hi@e.com"')
  })

  it('keeps a quote-breaking URL out of the href attribute', () => {
    const html = markdownToHtml('[x](https://e.com/"onmouseover="alert(1))')
    expect(html).not.toMatch(/href="[^"]*"onmouseover/)
  })

  it('renders "- " lines as one <ul> with <li> items', () => {
    const html = markdownToHtml('Intro\n\n- One\n- Two')
    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html).toMatch(/<li[^>]*>One<\/li>/)
    expect(html).toMatch(/<li[^>]*>Two<\/li>/)
    expect(html).not.toContain('- One')
  })

  it('renders "* " lines as a list, not italics', () => {
    const html = markdownToHtml('* One\n* Two')
    expect(html).toMatch(/<li[^>]*>One<\/li>/)
    expect(html).not.toContain('<em>')
  })

  it('renders numbered lines as an <ol>', () => {
    const html = markdownToHtml('1. First\n2. Second')
    expect(html).toContain('<ol')
    expect(html).toMatch(/<li[^>]*>First<\/li>/)
    expect(html).toMatch(/<li[^>]*>Second<\/li>/)
    expect(html).not.toContain('<ul')
  })

  it('keeps separate lists separate', () => {
    const html = markdownToHtml('- A\n\nMiddle\n\n- B')
    expect(html.match(/<ul/g)).toHaveLength(2)
  })

  it('turns a tiptap-markdown hard break (trailing backslash) into <br>', () => {
    const html = markdownToHtml('Cheers,\\\nThe Acme team')
    expect(html).toContain('Cheers,<br>The Acme team')
    expect(html).not.toContain('\\')
    expect(html.match(/<p/g)).toHaveLength(1)
  })

  it('still formats bold and links inside list items', () => {
    const html = markdownToHtml('- **Fast** setup\n- [Docs](https://e.com/docs)')
    expect(html).toContain('<strong>Fast</strong>')
    expect(html).toContain('<a href="https://e.com/docs"')
  })
})

describe('markdownToHtml backslash escapes', () => {
  it('shows backslash-escaped Markdown characters as plain text', () => {
    const html = markdownToHtml('Save \\*50%\\* today')
    expect(html).not.toContain('<em>')
    expect(html).not.toContain('\\')
    expect(html).toContain('&#42;50%&#42;')
  })
})
