'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, History, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorHeaderProps {
  landingPageUrl?: string
  historyHref: string
  versionCount: number
  campaignName?: string
  className?: string
}

export function EditorHeader({
  landingPageUrl,
  historyHref,
  versionCount,
  campaignName,
  className,
}: EditorHeaderProps) {
  return (
    <header
      className={cn(
        'border-b border-border bg-card flex-shrink-0 relative z-50 flex',
        className
      )}
    >
      {/* Left section - aligned with sidebar */}
      <div className="w-80 px-4 py-4 flex items-center gap-4 justify-end">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/campaigns">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>

      {/* Right section - main content area */}
      <div className="flex-1 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">Flashletter</span>
        </Link>

        <div className="hidden md:block">
          <div className="text-sm font-medium">
            {campaignName || 'Email Campaign Editor'}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-md">
            {landingPageUrl || 'No URL available'}
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
