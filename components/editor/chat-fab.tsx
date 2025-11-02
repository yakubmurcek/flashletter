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
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.95)] hover:scale-[1.04] transition-transform bg-gradient-to-br from-primary via-amber-400 to-orange-500"
      onClick={onClick}
    >
      <MessageSquare className="w-6 h-6" />
    </Button>
  )
}
