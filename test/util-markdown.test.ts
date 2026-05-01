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
