'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  generateDiff,
  collapseUnchangedLines,
  formatDiffStats,
  type DiffLine,
} from '@/lib/utils/diff'
import type { EmailVersion } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DiffViewerProps {
  oldVersion: EmailVersion | null
  newVersion: EmailVersion
  viewMode?: 'unified' | 'split'
}

type DiffSection = 'subject' | 'content'

export function DiffViewer({ oldVersion, newVersion, viewMode = 'unified' }: DiffViewerProps) {
  const [chosenSection, setActiveSection] = useState<DiffSection | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  if (!oldVersion) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">Initial version</h3>
          <p className="text-sm text-muted-foreground">
            This is the first version, so there are no changes to compare.
          </p>
        </div>
      </div>
    )
  }

  const subjectDiff = generateDiff(oldVersion.subject, newVersion.subject)
  const contentDiff = generateDiff(oldVersion.content, newVersion.content)

  // Open on whichever part actually changed (e.g. an AI subject rewrite).
  const contentChanged = oldVersion.content !== newVersion.content
  const subjectChanged = oldVersion.subject !== newVersion.subject
  const activeSection: DiffSection =
    chosenSection ?? (subjectChanged && !contentChanged ? 'subject' : 'content')

  const currentDiff = activeSection === 'subject' ? subjectDiff : contentDiff
  const collapsedLines = collapseUnchangedLines(currentDiff.lines, 3)

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const hasSubjectChanges = subjectDiff.stats.added > 0 || subjectDiff.stats.removed > 0
  const hasContentChanges = contentDiff.stats.added > 0 || contentDiff.stats.removed > 0

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Changes</h3>
            <p className="text-sm text-muted-foreground">Comparing with previous version</p>
          </div>
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(v) => setActiveSection(v as DiffSection)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="subject"
              className="gap-2"
            >
              Subject Line
              {hasSubjectChanges && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/20 rounded">Changed</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="content"
              className="gap-2"
            >
              Content
              {hasContentChanges && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/20 rounded">Changed</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-3 text-xs text-muted-foreground">
          {formatDiffStats(currentDiff.stats)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-4">
          <Card className="overflow-hidden">
            {viewMode === 'unified' ? (
              <div className="font-mono text-sm">
                {collapsedLines.map((item, index) => {
                  if ('type' in item && item.type === 'collapsed') {
                    const isExpanded = expandedSections.has(index)
                    return (
                      <div
                        key={index}
                        className="bg-muted/50 border-y border-border py-2 px-4 flex items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => toggleSection(index)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {isExpanded ? 'Hide' : 'Show'} {item.count} unchanged line
                            {item.count > 1 ? 's' : ''}
                          </span>
                        </Button>
                      </div>
                    )
                  }

                  const line = item as DiffLine
                  const bgColor =
                    line.type === 'added'
                      ? 'bg-green-500/10'
                      : line.type === 'removed'
                        ? 'bg-red-500/10'
                        : line.type === 'modified'
                          ? 'bg-yellow-500/10'
                          : 'bg-transparent'

                  const textColor =
                    line.type === 'added'
                      ? 'text-green-700 dark:text-green-400'
                      : line.type === 'removed'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-foreground'

                  const prefix =
                    line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '

                  const lineNum =
                    line.type === 'removed'
                      ? line.oldLineNumber || ''
                      : line.newLineNumber || line.lineNumber || ''

                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start border-b border-border last:border-b-0',
                        bgColor,
                      )}
                    >
                      <div className="w-12 flex-shrink-0 text-right pr-4 py-2 text-muted-foreground text-xs border-r border-border bg-muted/30">
                        {lineNum}
                      </div>
                      <div
                        className={cn('flex-1 px-4 py-2 whitespace-pre-wrap break-all', textColor)}
                      >
                        <span className="select-none mr-2 opacity-50">{prefix}</span>
                        {line.content || ' '}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Split view
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="font-mono text-sm">
                  <div className="bg-red-500/10 border-b border-border px-4 py-2 text-sm font-semibold">
                    Previous Version
                  </div>
                  {collapsedLines
                    .filter((item) => !('type' in item && item.type === 'collapsed'))
                    .map((item, index) => {
                      const line = item as DiffLine
                      if (line.type === 'added') return null

                      const bgColor = line.type === 'removed' ? 'bg-red-500/10' : 'bg-transparent'

                      return (
                        <div
                          key={index}
                          className={cn('flex items-start border-b border-border', bgColor)}
                        >
                          <div className="w-12 flex-shrink-0 text-right pr-4 py-2 text-muted-foreground text-xs">
                            {line.oldLineNumber || ''}
                          </div>
                          <div className="flex-1 px-4 py-2 whitespace-pre-wrap break-all">
                            {line.content || ' '}
                          </div>
                        </div>
                      )
                    })}
                </div>
                <div className="font-mono text-sm">
                  <div className="bg-green-500/10 border-b border-border px-4 py-2 text-sm font-semibold">
                    Current Version
                  </div>
                  {collapsedLines
                    .filter((item) => !('type' in item && item.type === 'collapsed'))
                    .map((item, index) => {
                      const line = item as DiffLine
                      if (line.type === 'removed') return null

                      const bgColor = line.type === 'added' ? 'bg-green-500/10' : 'bg-transparent'

                      return (
                        <div
                          key={index}
                          className={cn('flex items-start border-b border-border', bgColor)}
                        >
                          <div className="w-12 flex-shrink-0 text-right pr-4 py-2 text-muted-foreground text-xs">
                            {line.newLineNumber || line.lineNumber || ''}
                          </div>
                          <div className="flex-1 px-4 py-2 whitespace-pre-wrap break-all">
                            {line.content || ' '}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
