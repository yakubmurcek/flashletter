import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '@/lib/utils/markdown'

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

describe('empty input', () => {
  it('handles empty string', () => {
    // Source wraps any non-heading line in a <p>; empty input becomes a single
    // empty paragraph rather than '' — intentional, see lib/utils/markdown.ts.
    expect(markdownToHtml('')).toBe('<p style="margin-bottom: 1rem; line-height: 1.6;"></p>')
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
