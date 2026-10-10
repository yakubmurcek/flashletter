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

  it('renders a link inside a longer bold phrase', () => {
    const el = renderHtml('**Book a call at [our site](https://example.com) now**')
    expect(el.querySelectorAll('a')).toHaveLength(1)
    expect(el.querySelectorAll('strong')).toHaveLength(1)
    expect(el.textContent).toBe('Book a call at our site now')
  })
})
