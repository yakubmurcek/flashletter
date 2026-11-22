import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/utils/markdown-renderer'

function renderHtml(content: string) {
  const { container } = render(<MarkdownRenderer content={content} />)
  return container
}

describe('MarkdownRenderer inline formatting', () => {
  it('renders plain bold and links side by side', () => {
    const el = renderHtml('Read **this** and [the docs](https://example.com).')
    expect(el.querySelector('strong')?.textContent).toBe('this')
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    expect(el.textContent).toBe('Read this and the docs.')
  })

  // Generated emails end with a Markdown CTA link, often bolded.
  it('renders a bolded link once, as a bold link', () => {
    const el = renderHtml('**[Start your trial](https://example.com)** today')
    const links = el.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://example.com')
    expect(links[0].closest('strong')).not.toBeNull()
    expect(el.textContent).toBe('Start your trial today')
  })

  it('renders bold text inside a link once', () => {
    const el = renderHtml('[**Start your trial**](https://example.com) today')
    const links = el.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0].querySelector('strong')?.textContent).toBe('Start your trial')
    expect(el.textContent).toBe('Start your trial today')
  })

  it('renders a numbered list as separate items, not one run-on line', () => {
    const el = renderHtml(
      'Here are three options:\n\n1. Your first week, sorted\n2. Three things to try today\n3. Quick question\n\nWant me to apply one?',
    )
    const items = el.querySelectorAll('ol > li')
    expect(Array.from(items, (li) => li.textContent)).toEqual([
      'Your first week, sorted',
      'Three things to try today',
      'Quick question',
    ])
    expect(el.querySelectorAll('p')).toHaveLength(2)
  })

  it('starts a numbered list right after a paragraph line', () => {
    const el = renderHtml('Options:\n1. **Bold** one\n2. Two')
    expect(el.querySelector('p')?.textContent).toBe('Options:')
    expect(el.querySelectorAll('ol > li')).toHaveLength(2)
    expect(el.querySelector('ol strong')?.textContent).toBe('Bold')
  })

  it('keeps a line that starts with a year as a paragraph', () => {
    const el = renderHtml('2024. What a year it was for our customers.')
    expect(el.querySelector('ol')).toBeNull()
    expect(el.querySelector('p')?.textContent).toBe('2024. What a year it was for our customers.')
  })

  it('renders a link inside a longer bold phrase', () => {
    const el = renderHtml('**Book a call at [our site](https://example.com) now**')
    expect(el.querySelectorAll('a')).toHaveLength(1)
    expect(el.querySelectorAll('strong')).toHaveLength(1)
    expect(el.textContent).toBe('Book a call at our site now')
  })
})
