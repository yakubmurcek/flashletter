'use client'

import { memo, useEffect, useRef } from 'react'
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-2',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          )}
          <Card
            className={cn(
              'px-3 py-2 max-w-[85%] min-w-[120px]',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : message.appliedEdit
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-muted'
            )}
          >
            {message.appliedEdit && (
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Email Updated
                </span>
              </div>
            )}
            {message.context && (
              <div className="mb-1 pb-1 border-b border-primary-foreground/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 opacity-70" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {message.context.action}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 bg-black/10 dark:bg-white/10 px-2 py-1 rounded">
                  "{message.context.text}"
                </div>
              </div>
            )}
            {message.role === 'assistant' ? (
              <MarkdownRenderer content={message.content} />
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
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium">You</span>
            </div>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex gap-2 justify-start">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <Card className="px-2 py-1 bg-muted min-w-[120px]">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </Card>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

export const AIChatMessageList = memo(MessageListBase)
