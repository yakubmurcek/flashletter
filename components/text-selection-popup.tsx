'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Sparkles,
  RefreshCw,
  Minimize2,
  Maximize2,
  Pencil,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TextSelectionPopupProps {
  selectedText: string
  position: { x: number; y: number }
  onAction: (action: string, text: string) => void
  onClose: () => void
}

const ACTIONS = [
  { label: 'Ask AI about this', icon: Sparkles, color: 'text-blue-500' },
  { label: 'Improve this', icon: CheckCircle2, color: 'text-primary' },
  { label: 'Rewrite this', icon: RefreshCw, color: 'text-purple-500' },
  { label: 'Make it shorter', icon: Minimize2, color: 'text-orange-500' },
  { label: 'Make it longer', icon: Maximize2, color: 'text-green-500' },
  { label: 'Fix grammar', icon: Pencil, color: 'text-pink-500' },
]

export function TextSelectionPopup({
  selectedText,
  position,
  onAction,
  onClose,
}: TextSelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.toString().trim() === '') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [onClose])

  const handleActionClick = (action: string) => {
    onAction(action, selectedText)
    onClose()
  }

  return (
    <Card
      ref={popupRef}
      className="fixed z-50 shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <div className="p-2 flex items-center gap-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              onClick={() => handleActionClick(action.label)}
              className="gap-2 hover:bg-primary/10 transition-colors"
              title={action.label}
            >
              <Icon className={cn('w-4 h-4', action.color)} />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
