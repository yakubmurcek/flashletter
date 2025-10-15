'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'

interface AIChatQuickActionsProps {
  actions: string[]
  onSelect: (action: string) => void
  isVisible: boolean
}

function QuickActionsBase({
  actions,
  onSelect,
  isVisible,
}: AIChatQuickActionsProps) {
  if (!isVisible || actions.length === 0) return null

  return (
    <div className="px-4 pt-2 pb-3 border-t border-border/40">
      <p className="text-xs text-muted-foreground mb-2 font-medium">
        Suggested actions
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            onClick={() => onSelect(action)}
            className="text-xs bg-primary/5 border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-all duration-200"
          >
            {action}
          </Button>
        ))}
      </div>
    </div>
  )
}

export const AIChatQuickActions = memo(QuickActionsBase)
