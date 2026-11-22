'use client'

import { memo, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          )}
          <Card
            className={cn(
              'gap-1 px-3 py-2 max-w-[85%] min-w-[120px] transition-colors',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground border-0 shadow-sm'
                : message.appliedEdit
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-card border border-border hover:border-primary/30',
            )}
          >
            {message.appliedEdit && (
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-primary/20">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-primary">Email updated</span>
              </div>
            )}
            {message.context && (
              <div className="mb-1 pb-1 border-b border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 bg-primary/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-primary" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                    {message.context.action}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 bg-muted px-2 py-1 rounded border border-border">
                  &quot;{message.context.text}&quot;
                </div>
              </div>
            )}
            {message.role === 'assistant' ? (
              <>
                <MarkdownRenderer content={message.content} />
                {message.proposedEdit && message.applyProposedEdit && (
                  <ProposedEdit
                    subject={message.proposedEdit.subject}
                    content={message.proposedEdit.content}
                    onApply={message.applyProposedEdit}
                  />
                )}
              </>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
            <p
              className={cn(
                'text-xs mt-1',
                message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground',
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
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <Card className="px-3 py-2 bg-card border border-border min-w-[120px]">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </Card>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

/** An AI edit held back because the user changed the email while it was written. */
function ProposedEdit({
  subject,
  content,
  onApply,
}: {
  subject?: string
  content?: string
  onApply: () => void
}) {
  return (
    <div className="mt-2 pt-2 border-t border-border space-y-2">
      <p className="text-xs text-muted-foreground">
        You changed this email while I was writing, so I kept your version. Here is mine:
      </p>
      <div className="rounded border border-border bg-muted px-2 py-1.5 text-sm space-y-1">
        {subject !== undefined && (
          <p>
            <span className="font-semibold">Subject:</span> {subject}
          </p>
        )}
        {content !== undefined && <MarkdownRenderer content={content} />}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onApply}
      >
        Apply anyway
      </Button>
    </div>
  )
}

export const AIChatMessageList = memo(MessageListBase)
