import { describe, it, expect } from 'vitest'
import {
  generateDiff,
  collapseUnchangedLines,
  formatDiffStats,
  extractChangeSummary,
} from '@/lib/utils/diff'

describe('generateDiff', () => {
  it('detects unchanged text', () => {
    const result = generateDiff('hello', 'hello')
    expect(result.stats.unchanged).toBe(1)
    expect(result.stats.added).toBe(0)
    expect(result.stats.removed).toBe(0)
    expect(result.lines[0]?.type).toBe('unchanged')
  })

  it('detects added lines', () => {
    const result = generateDiff('hello', 'hello\nworld')
    expect(result.stats.added).toBeGreaterThan(0)
    expect(result.lines.some((l) => l.type === 'added')).toBe(true)
  })

  it('detects removed lines', () => {
    const result = generateDiff('hello\nworld', 'hello')
    expect(result.stats.removed).toBeGreaterThan(0)
    expect(result.lines.some((l) => l.type === 'removed')).toBe(true)
  })

  it('detects modified lines', () => {
    const result = generateDiff('hello', 'goodbye')
    expect(result.stats.modified).toBeGreaterThan(0)
  })

  it('handles multi-line text', () => {
    const old = 'line1\nline2\nline3'
    const new_ = 'line1\nmodified\nline3'
    const result = generateDiff(old, new_)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.stats.modified).toBeGreaterThan(0)
  })

  it('handles empty strings', () => {
    // '' splits to [''], 'hello' splits to ['hello']; both arrays have length 1
    // so the single line counts as a modification, not an add.
    const result = generateDiff('', 'hello')
    expect(result.stats.added + result.stats.modified).toBeGreaterThan(0)
  })

  it('handles multiple changes', () => {
    const old = 'a\nb\nc'
    const new_ = 'a\nx\ny\nc'
    const result = generateDiff(old, new_)
    expect(result.stats.added + result.stats.removed + result.stats.modified).toBeGreaterThan(0)
  })

  it('includes line numbers for unchanged lines', () => {
    const result = generateDiff('a\nb\nc', 'a\nb\nc')
    result.lines.forEach((line) => {
      if (line.type === 'unchanged') {
        expect(line.lineNumber).toBeGreaterThan(0)
      }
    })
  })

  it('includes oldLineNumber for removed lines', () => {
    const result = generateDiff('old\nkeep', 'keep')
    const removedLine = result.lines.find((l) => l.type === 'removed')
    expect(removedLine?.oldLineNumber).toBeDefined()
  })

  it('includes newLineNumber for added lines', () => {
    const result = generateDiff('keep', 'keep\nnew')
    const addedLine = result.lines.find((l) => l.type === 'added')
    expect(addedLine?.newLineNumber).toBeDefined()
  })
})

describe('collapseUnchangedLines', () => {
  it('returns all lines when no collapsing needed', () => {
    const lines = [
      { type: 'added' as const, content: 'a', lineNumber: 1 },
      { type: 'unchanged' as const, content: 'b', lineNumber: 2 },
      { type: 'removed' as const, content: 'c', lineNumber: null },
    ]
    const result = collapseUnchangedLines(lines, 3)
    expect(result).toHaveLength(3)
  })

  it('collapses many consecutive unchanged lines', () => {
    const lines = Array.from({ length: 10 }, (_, i) => ({
      type: 'unchanged' as const,
      content: `line${i}`,
      lineNumber: i + 1,
    }))
    const result = collapseUnchangedLines(lines, 2)
    expect(result.some((l) => (l as { type: string }).type === 'collapsed')).toBe(true)
  })

  it('keeps context lines around changes', () => {
    const lines = [
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'unchanged' as const,
        content: `line${i}`,
        lineNumber: i + 1,
      })),
      { type: 'added' as const, content: 'new', lineNumber: 6 },
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'unchanged' as const,
        content: `line${i + 6}`,
        lineNumber: i + 7,
      })),
    ]
    const result = collapseUnchangedLines(lines, 2)
    // Should have context before and after the added line
    expect(result.length).toBeLessThan(lines.length)
  })

  it('handles empty array', () => {
    const result = collapseUnchangedLines([])
    expect(result).toEqual([])
  })

  it('respects context line count', () => {
    type DiffLine = { type: 'unchanged' | 'added' | 'removed'; content: string; lineNumber: number }
    const lines: DiffLine[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'unchanged',
      content: `line${i}`,
      lineNumber: i + 1,
    }))
    lines.splice(10, 0, { type: 'added', content: 'new', lineNumber: 11 })
    const result = collapseUnchangedLines(lines, 1)
    // With context of 1, there should be a collapsed section
    expect(result.some((l) => (l as { type: string }).type === 'collapsed')).toBe(true)
  })
})

describe('formatDiffStats', () => {
  it('formats additions', () => {
    const result = formatDiffStats({ added: 5, removed: 0, modified: 0, unchanged: 10 })
    expect(result).toBe('+5 lines added')
  })

  it('formats removals', () => {
    const result = formatDiffStats({ added: 0, removed: 3, modified: 0, unchanged: 10 })
    expect(result).toBe('-3 lines removed')
  })

  it('formats modifications', () => {
    const result = formatDiffStats({ added: 0, removed: 0, modified: 2, unchanged: 10 })
    expect(result).toBe('2 lines changed')
  })

  it('combines multiple changes', () => {
    const result = formatDiffStats({ added: 1, removed: 2, modified: 3, unchanged: 10 })
    expect(result).toBe('+1 line added, -2 lines removed, 3 lines changed')
  })

  it('returns "No changes" for empty diff', () => {
    const result = formatDiffStats({ added: 0, removed: 0, modified: 0, unchanged: 10 })
    expect(result).toBe('No changes')
  })
})

describe('extractChangeSummary', () => {
  it('returns "Initial version" for null oldEmail', () => {
    const result = extractChangeSummary(null, { subject: 'New', content: 'Content' })
    expect(result).toBe('Initial version')
  })

  it('detects subject change', () => {
    const result = extractChangeSummary(
      { subject: 'Old', content: 'Same content' },
      { subject: 'New', content: 'Same content' },
    )
    expect(result).toContain('subject')
  })

  it('detects content changes', () => {
    const result = extractChangeSummary(
      { subject: 'Same', content: 'Old content' },
      { subject: 'Same', content: 'New content' },
    )
    expect(result).toContain('line')
  })

  it('detects both subject and content changes', () => {
    const result = extractChangeSummary(
      { subject: 'Old', content: 'Old content' },
      { subject: 'New', content: 'New content' },
    )
    expect(result).toContain('subject')
    expect(result).toContain('line')
  })

  it('returns "No changes" when emails are identical', () => {
    const email = { subject: 'Same', content: 'Same' }
    const result = extractChangeSummary(email, email)
    expect(result).toBe('No changes')
  })

  it('counts multiple line changes', () => {
    const result = extractChangeSummary(
      { subject: 'S', content: 'line1\nline2\nline3' },
      { subject: 'S', content: 'modified1\nmodified2\nline3' },
    )
    expect(result).toContain('2 lines')
  })

  it('uses singular "line" for single change', () => {
    const result = extractChangeSummary(
      { subject: 'S', content: 'line1\nline2' },
      { subject: 'S', content: 'modified\nline2' },
    )
    expect(result).toContain('1 line')
  })
})
