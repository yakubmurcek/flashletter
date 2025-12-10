'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Sparkles, RefreshCw, Minimize2, Maximize2, Pencil, CheckCircle2 } from 'lucide-react'
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
  { label: 'Rewrite this', icon: RefreshCw, color: 'text-amber-500' },
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
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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
      className="fixed z-[70] shadow-2xl border border-border bg-card/98 backdrop-blur-sm p-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
    >
      <div className="flex items-center gap-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => handleActionClick(action.label)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground hover:text-foreground cursor-pointer"
              title={action.label}
            >
              <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', action.color)} />
              <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
