'use client'

import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ChatFabProps {
  onClick: () => void
}

export function ChatFab({ onClick }: ChatFabProps) {
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setShowHint(false), 8000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="fixed bottom-6 right-6">
      {showHint && (
        <div className="mb-2 mr-1 float-right select-none text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground shadow-sm animate-bounce-slow">
          Ask AI
        </div>
      )}
      <Button
        aria-label="Open AI assistant"
        title="Ask AI"
        variant="default"
        size="lg"
        className="rounded-full w-14 h-14 shadow-lg hover:scale-[1.04] transition-transform animate-pulse-glow"
        onClick={onClick}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    </div>
  )
}
