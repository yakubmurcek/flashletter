'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, History } from 'lucide-react'
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
        'flex-shrink-0 relative z-50',
        'supports-[backdrop-filter]:backdrop-blur-2xl bg-background/70',
        'shadow-[0_15px_60px_-35px_rgba(15,23,42,0.35)] ring-1 ring-border/10',
        className,
      )}
    >
      <div className="w-full px-6 py-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 rounded-full bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
          >
            <Link href="/campaigns">
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shadow-inner">
              <Image
                src="/icon-192.webp"
                alt="Flashletter"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-[0.18em]">
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
              className="gap-2 rounded-full border-border/40 bg-white/5 hover:bg-white/10 hover:border-border/60 transition-colors relative"
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
              className="gap-2 rounded-full border-border/40 bg-white/5 hover:bg-white/10 hover:border-border/60 transition-colors"
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
