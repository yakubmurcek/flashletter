'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw, Info } from 'lucide-react'
import type { EmailVersion } from '@/lib/types'
import { MarkdownRenderer } from '@/components/markdown-renderer'

interface VersionPreviewProps {
  version: EmailVersion
  onRestore: (version: EmailVersion) => void
  isLatest?: boolean
}

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionPreview({ version, onRestore, isLatest = false }: VersionPreviewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card p-4 flex-shrink-0">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4" />
              <span className="font-medium">
                Viewing: {isLatest ? 'Latest version' : 'Previous version'}
              </span>
            </div>
            <div className="text-xs">{formatTimestamp(version.timestamp)}</div>
            <div className="text-xs mt-1">{version.changesSummary}</div>
          </div>
          {!isLatest && (
            <Button
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={() => onRestore(version)}
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 bg-card shadow-sm">
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Subject
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {version.subject || 'No subject'}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="text-foreground">
                    <MarkdownRenderer content={version.content} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
