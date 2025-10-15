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
        'border-b border-border backdrop-blur-sm bg-card/80 flex-shrink-0 relative z-50 flex',
        className
      )}
    >
      {/* Left section - aligned with sidebar */}
      <div className="w-80 px-4 py-4 flex items-center gap-4 justify-end">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 hover:bg-primary/10 transition-colors"
        >
          <Link href="/campaigns">
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>

      {/* Right section - main content area */}
      <div className="flex-1 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden group-hover:scale-110 transition-transform duration-300">
            <Image
              src="/icon-192.png"
              alt="Flashletter"
              width={32}
              height={32}
              className="w-full h-full"
            />
          </div>
          <span className="text-xl font-semibold group-hover:text-primary transition-colors">
            Flashletter
          </span>
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
            className="gap-2 bg-transparent hover:bg-primary/10 transition-colors relative"
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
            className="gap-2 bg-transparent hover:bg-primary/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60 transition-all duration-300"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
