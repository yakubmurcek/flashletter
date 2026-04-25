'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/brand-mark'

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
      className={cn('flex-shrink-0 relative z-50 bg-background border-b border-border', className)}
    >
      <div className="w-full px-6 py-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2"
          >
            <Link href="/campaigns">
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark href="/campaigns" />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Active campaign
              </div>
              <div className="text-base font-semibold leading-snug truncate">
                {campaignName || 'Email Campaign Editor'}
              </div>
              {landingPageUrl ? (
                <a
                  href={landingPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {landingPageUrl}
                </a>
              ) : (
                <div className="text-xs sm:text-sm text-muted-foreground">No URL available</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 relative"
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
