export type DiffLineType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffLine {
  type: DiffLineType
  lineNumber: number | null // null for removed lines in split view
  content: string
  oldLineNumber?: number // for modified/removed lines
  newLineNumber?: number // for modified/added lines
}

export interface DiffResult {
  lines: DiffLine[]
  stats: {
    added: number
    removed: number
    modified: number
    unchanged: number
  }
}

/**
 * Simple line-by-line diff algorithm
 * Compares two texts and generates a diff with line numbers and types
 */
export function generateDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  const diffLines: DiffLine[] = []
  const stats = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
  }

  // Simple diff using longest common subsequence approach
  let oldIdx = 0
  let newIdx = 0

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx]
    const newLine = newLines[newIdx]

    // Both lines exist
    if (oldLine !== undefined && newLine !== undefined) {
      if (oldLine === newLine) {
        // Unchanged
        diffLines.push({
          type: 'unchanged',
          lineNumber: newIdx + 1,
          content: newLine,
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        })
        stats.unchanged++
        oldIdx++
        newIdx++
      } else {
        // Check if it's a modification or add/remove
        // Look ahead to see if the next line matches
        const nextOldMatchesNew = oldLines[oldIdx + 1] === newLine
        const nextNewMatchesOld = newLines[newIdx + 1] === oldLine

        if (nextOldMatchesNew && !nextNewMatchesOld) {
          // Old line was removed
          diffLines.push({
            type: 'removed',
            lineNumber: null,
            content: oldLine,
            oldLineNumber: oldIdx + 1,
          })
          stats.removed++
          oldIdx++
        } else if (nextNewMatchesOld && !nextOldMatchesNew) {
          // New line was added
          diffLines.push({
            type: 'added',
            lineNumber: newIdx + 1,
            content: newLine,
            newLineNumber: newIdx + 1,
          })
          stats.added++
          newIdx++
        } else {
          // Line was modified
          diffLines.push({
            type: 'removed',
            lineNumber: null,
            content: oldLine,
            oldLineNumber: oldIdx + 1,
          })
          diffLines.push({
            type: 'added',
            lineNumber: newIdx + 1,
            content: newLine,
            newLineNumber: newIdx + 1,
          })
          stats.modified++
          oldIdx++
          newIdx++
        }
      }
    } else if (oldLine !== undefined) {
      // Only old line exists (removed)
      diffLines.push({
        type: 'removed',
        lineNumber: null,
        content: oldLine,
        oldLineNumber: oldIdx + 1,
      })
      stats.removed++
      oldIdx++
    } else if (newLine !== undefined) {
      // Only new line exists (added)
      diffLines.push({
        type: 'added',
        lineNumber: newIdx + 1,
        content: newLine,
        newLineNumber: newIdx + 1,
      })
      stats.added++
      newIdx++
    } else {
      break
    }
  }

  return {
    lines: diffLines,
    stats,
  }
}

/**
 * Collapse consecutive unchanged lines for better readability
 * Keeps context lines (3 before and after changes)
 */
export function collapseUnchangedLines(
  lines: DiffLine[],
  contextLines: number = 3,
): (DiffLine | { type: 'collapsed'; count: number })[] {
  const result: (DiffLine | { type: 'collapsed'; count: number })[] = []
  let unchangedBuffer: DiffLine[] = []

  for (const line of lines) {
    if (line.type === 'unchanged') {
      unchangedBuffer.push(line)
    } else {
      // We hit a changed line
      if (unchangedBuffer.length > contextLines * 2) {
        // Add context before
        result.push(...unchangedBuffer.slice(0, contextLines))

        // Add collapsed indicator
        const collapsedCount = unchangedBuffer.length - contextLines * 2
        result.push({ type: 'collapsed', count: collapsedCount })

        // Add context after
        result.push(...unchangedBuffer.slice(-contextLines))
      } else {
        // Not enough to collapse, add all
        result.push(...unchangedBuffer)
      }

      unchangedBuffer = []
      result.push(line)
    }
  }

  // Handle remaining unchanged lines
  if (unchangedBuffer.length > contextLines) {
    result.push(...unchangedBuffer.slice(0, contextLines))
    const collapsedCount = unchangedBuffer.length - contextLines
    if (collapsedCount > 0) {
      result.push({ type: 'collapsed', count: collapsedCount })
    }
  } else {
    result.push(...unchangedBuffer)
  }

  return result
}

/**
 * Format diff stats into a human-readable string
 */
export function formatDiffStats(stats: DiffResult['stats']): string {
  const lines = (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`
  const parts: string[] = []

  if (stats.added > 0) {
    parts.push(`+${lines(stats.added)} added`)
  }
  if (stats.removed > 0) {
    parts.push(`-${lines(stats.removed)} removed`)
  }
  if (stats.modified > 0) {
    parts.push(`${lines(stats.modified)} changed`)
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes'
}

/**
 * Generate a simple change summary comparing two texts
 */
export function extractChangeSummary(
  oldEmail: { subject: string; content: string } | null,
  newEmail: { subject: string; content: string },
): string {
  if (!oldEmail) {
    return 'Initial version'
  }

  const changes: string[] = []

  if (oldEmail.subject !== newEmail.subject) {
    changes.push('subject')
  }

  // Use the existing diff logic for content
  const oldLines = oldEmail.content.split('\n')
  const newLines = newEmail.content.split('\n')

  let diffCount = 0
  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      diffCount++
    }
  }

  if (diffCount > 0) {
    changes.push(`${diffCount} line${diffCount > 1 ? 's' : ''}`)
  }

  if (changes.length === 0) {
    return 'No changes'
  }

  return `${changes.join(' and ')} changed`
}
