'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { Loader2, Sparkles } from 'lucide-react'
import type { ChatMessage } from '@/lib/hooks/use-ai-chat'

interface AIChatMessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
}

function MessageListBase({ messages, isLoading }: AIChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [typedContentById, setTypedContentById] = useState<Record<string, string>>({})
  const typingTimersRef = useRef<Record<string, number>>({})

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!messages.length) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    const full = lastMessage.content
    const id = lastMessage.id
    if (typedContentById[id] === full) return

    // Initialize typed content if first time
    if (typedContentById[id] == null) {
      setTypedContentById((prev) => ({ ...prev, [id]: '' }))
    }

    const typeMore = () => {
      setTypedContentById((prev) => {
        const current = prev[id] ?? ''
        if (current.length >= full.length) return prev

        // Fast, human-like chunks with slight randomness
        const chunk = Math.min(
          full.length - current.length,
          Math.floor(Math.random() * 4) + 3
        )
        const next = full.slice(0, current.length + chunk)
        return { ...prev, [id]: next }
      })

      // Scroll as we type
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

      const currentNow = typedContentById[id] ?? ''
      const done = (currentNow?.length || 0) >= full.length
      if (done) return

      const delay = Math.floor(Math.random() * 15) + 14 // 14-28ms
      const timer = window.setTimeout(typeMore, delay)
      typingTimersRef.current[id] = timer
    }

    // Kick off typing loop
    const startDelay = Math.floor(Math.random() * 41) + 10 // 10-50ms
    const timer = window.setTimeout(typeMore, startDelay)
    typingTimersRef.current[id] = timer

    return () => {
      const t = typingTimersRef.current[id]
      if (t) window.clearTimeout(t)
    }
  }, [messages, typedContentById])

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
      Object.values(typingTimersRef.current).forEach((t) =>
        window.clearTimeout(t)
      )
    }
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-2',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-amber-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          )}
          <Card
            className={cn(
              'px-3 py-2 max-w-[85%] min-w-[120px] transition-all',
              message.role === 'user'
                ? 'bg-gradient-to-r from-orange-400 to-amber-300/70 text-white border-0 shadow-sm'
                : message.appliedEdit
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-primary/5 border border-border/40 hover:border-primary/20'
            )}
          >
            {message.appliedEdit && (
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Email Updated
                </span>
              </div>
            )}
            {message.context && (
              <div className="mb-1 pb-1 border-b border-border/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 bg-primary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                    {message.context.action}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 bg-black/10 dark:bg-white/10 px-2 py-1 rounded border border-border/40">
                  &quot;{message.context.text}&quot;
                </div>
              </div>
            )}
            {message.role === 'assistant' ? (
              <>
                <MarkdownRenderer
                  content={typedContentById[message.id] ?? message.content}
                />
                {typedContentById[message.id] != null &&
                  (typedContentById[message.id]?.length ?? 0) <
                    message.content.length && (
                    <span className="inline-block w-2 h-4 ml-0.5 align-baseline bg-primary/60 animate-pulse rounded-sm" />
                  )}
              </>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            )}
            <p
              className={cn(
                'text-xs mt-1',
                message.role === 'user'
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              )}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </Card>
          {message.role === 'user' && (
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">You</span>
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-2 justify-start">
          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-amber-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <Card className="px-3 py-2 bg-primary/5 border border-border/40 min-w-[120px]">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </Card>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

export const AIChatMessageList = memo(MessageListBase)
