'use client'

import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'

interface ChatFabProps {
  onClick: () => void
}

export function ChatFab({ onClick }: ChatFabProps) {
  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-2xl hover:scale-110 transition-transform animate-pulse"
      onClick={onClick}
    >
      <MessageSquare className="w-6 h-6" />
    </Button>
  )
}
