'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/brand/brand-mark'
import { SendTestDialog } from '@/components/editor/send-test-dialog'
import { FEATURE_FLAGS } from '@/lib/constants/app'

interface EditorHeaderProps {
  landingPageUrl?: string
  historyHref: string
  versionCount: number
  campaignName?: string
  className?: string
  campaignId?: string
  selectedEmailDay?: number
  selectedEmailSubject?: string
}

export function EditorHeader({
  landingPageUrl,
  historyHref,
  versionCount,
  campaignName,
  className,
  campaignId,
  selectedEmailDay,
  selectedEmailSubject,
}: EditorHeaderProps) {
  const canSendTest = !!campaignId && typeof selectedEmailDay === 'number' && !!selectedEmailSubject
  return (
    <header
      className={cn('flex-shrink-0 relative z-50 bg-background border-b border-border', className)}
    >
      <div className="w-full px-4 py-3 sm:px-6">
        <div className="flex w-full items-center gap-3 sm:gap-4">
          <BrandMark
            href="/campaigns"
            className="flex-shrink-0"
          />
          <span
            aria-hidden="true"
            className="hidden h-6 w-px bg-border sm:block"
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-snug truncate sm:text-base">
              {campaignName || 'Email Campaign Editor'}
            </div>
            {landingPageUrl && (
              <a
                href={landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {landingPageUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2"
            >
              <Link
                href="/campaigns"
                aria-label="All campaigns"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">All campaigns</span>
              </Link>
            </Button>
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
            {!FEATURE_FLAGS.ENABLE_TEST_SEND ? null : canSendTest ? (
              <SendTestDialog
                campaignId={campaignId!}
                emailDay={selectedEmailDay!}
                emailSubject={selectedEmailSubject!}
                trigger={
                  <Button
                    size="sm"
                    className="gap-2"
                  >
                    <Inbox className="w-4 h-4" />
                    <span className="hidden sm:inline">Send to my inbox</span>
                  </Button>
                }
              />
            ) : (
              <Button
                size="sm"
                className="gap-2"
                disabled
              >
                <Inbox className="w-4 h-4" />
                <span className="hidden sm:inline">Send to my inbox</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
