'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, RotateCcw } from 'lucide-react'
import type { EmailVersion } from '@/lib/types'
import { cn } from '@/lib/utils'

interface VersionListProps {
  versions: EmailVersion[]
  selectedVersionId: string | null
  onSelectVersion: (versionId: string) => void
  onRestoreVersion: (version: EmailVersion) => void
}

/**
 * Format timestamp to human-readable relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return 'Just now'
  } else if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * Format timestamp to absolute time
 */
function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionList({
  versions,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
}: VersionListProps) {
  // Reverse to show newest first
  const sortedVersions = [...versions].reverse()

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Clock className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Saved Versions Yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          When you save changes to this email, previous versions will appear
          here so you can review and restore them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Version History
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {versions.length} saved version{versions.length > 1 ? 's' : ''}
        </p>
      </div>

      {sortedVersions.map((version, index) => {
        const isSelected = version.id === selectedVersionId
        const isLatest = index === 0

        return (
          <Card
            key={version.id}
            className={cn(
              'p-4 cursor-pointer transition-all hover:shadow-md border-2',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-transparent hover:border-border'
            )}
            onClick={() => onSelectVersion(version.id)}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      Version {versions.length - index}
                    </span>
                    {isLatest && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(version.timestamp)}
                  </div>
                  <div
                    className="text-xs text-muted-foreground"
                    title={formatAbsoluteTime(version.timestamp)}
                  >
                    {formatAbsoluteTime(version.timestamp)}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {version.changesSummary}
              </div>

              {!isLatest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 mt-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRestoreVersion(version)
                  }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore This Version
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
