'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorHeaderProps {
  landingPageUrl?: string
  historyHref: string
  versionCount: number
  className?: string
}

export function EditorHeader({
  landingPageUrl,
  historyHref,
  versionCount,
  className,
}: EditorHeaderProps) {
  return (
    <header
      className={cn(
        'border-b border-border bg-card flex-shrink-0 relative z-50',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/campaigns">
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </Link>
          </Button>
          <div className="hidden md:block">
            <div className="text-sm font-medium">Email Campaign Editor</div>
            <div className="text-xs text-muted-foreground truncate max-w-md">
              {landingPageUrl || 'No URL available'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent relative"
            asChild
          >
            <Link href={historyHref}>
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {versionCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {versionCount}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
