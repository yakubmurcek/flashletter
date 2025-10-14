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
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">AI Assistant</h3>
          <p className="text-xs text-muted-foreground">
            {hasCampaignContext ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Full campaign context
              </span>
            ) : (
              'Always here to help'
            )}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

export const AIChatHeader = memo(HeaderBase)
