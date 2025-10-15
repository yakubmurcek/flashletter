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
    <div className="px-4 pt-2 pb-3">
      <p className="text-xs text-muted-foreground mb-2">Suggested actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            onClick={() => onSelect(action)}
            className="text-xs bg-transparent"
          >
            {action}
          </Button>
        ))}
      </div>
    </div>
  )
}

export const AIChatQuickActions = memo(QuickActionsBase)
