'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, History } from 'lucide-react'
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
        'flex-shrink-0 relative z-50 flex items-center',
        'supports-[backdrop-filter]:backdrop-blur-2xl bg-background/70',
        'shadow-[0_15px_60px_-35px_rgba(15,23,42,0.35)] ring-1 ring-border/10',
        className
      )}
    >
      {/* Left section - aligned with sidebar */}
      <div className="w-80 px-6 py-4 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Link href="/campaigns">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>

      {/* Right section - main content area */}
      <div className="flex-1 px-6 py-4 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 transition-all hover:bg-white/10 hover:shadow-md"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-border/20 transition-transform duration-300 group-hover:scale-110">
            <Image
              src="/icon-192.webp"
              alt="Flashletter"
              width={32}
              height={32}
              className="w-full h-full"
            />
          </div>
          <span className="text-lg font-semibold">
            Flashletter
          </span>
        </Link>

        <div className="hidden md:block flex-1">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em] mb-1">
            Active campaign
          </div>
          <div className="text-base font-semibold truncate">
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
          <Button
            size="sm"
            className="gap-2 rounded-full bg-gradient-to-r from-primary via-amber-400 to-orange-500/80 text-primary-foreground hover:shadow-lg transition-all duration-300"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
