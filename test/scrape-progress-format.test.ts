import { describe, expect, it } from 'vitest'
import { formatProgressMessage } from '@/lib/types/scrape-progress'

describe('formatProgressMessage', () => {
  it('never shows a placeholder before the title is known', () => {
    expect(formatProgressMessage('Reading "{title}"…', { domain: 'e.com' })).toBe(
      'Reading the page…',
    )
  })

  it('shortens long page titles', () => {
    const msg = formatProgressMessage('Reading "{title}"…', { title: 'x'.repeat(80) })
    expect(msg.length).toBeLessThan(60)
  })
})
