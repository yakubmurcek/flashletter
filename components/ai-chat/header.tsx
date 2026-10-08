'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, X } from 'lucide-react'

interface AIChatHeaderProps {
  onClose: () => void
  hasCampaignContext: boolean
}

function HeaderBase({ onClose, hasCampaignContext }: AIChatHeaderProps) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded-full border border-border">
              BETA
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasCampaignContext ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Read your page and emails
              </span>
            ) : (
              'Waiting for your emails'
            )}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close AI assistant"
        className="hover:bg-primary/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

export const AIChatHeader = memo(HeaderBase)
