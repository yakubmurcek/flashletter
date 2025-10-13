'use client'

import type React from 'react'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './markdown-renderer'
import type { SelectedContext, FullCampaignContext } from '@/lib/types'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  appliedEdit?: boolean
  context?: {
    text: string
    action: string
  }
}

interface EmailEdits {
  subject?: string
  content?: string
}

interface AIChatAssistantProps {
  onClose: () => void
  campaignContext?: FullCampaignContext
  emailContext?: {
    subject?: string
    content?: string
    campaignType?: string
  }
  onApplyEdits?: (edits: EmailEdits) => void
  selectedContext?: SelectedContext | null
  onClearContext?: () => void
  autoSubmitMessage?: string | null
  onAutoSubmitComplete?: () => void
}

export function AIChatAssistant({
  onClose,
  campaignContext,
  emailContext,
  onApplyEdits,
  selectedContext,
  onClearContext,
  autoSubmitMessage,
  onAutoSubmitComplete,
}: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        "Hi! I'm your AI assistant. I can help you refine your email content, suggest improvements, or answer questions about your campaign. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-submit when autoSubmitMessage is provided
  useEffect(() => {
    if (autoSubmitMessage && !isLoading) {
      setInput(autoSubmitMessage)
      // Trigger submit after setting input
      setTimeout(() => {
        const form = document.querySelector(
          '[data-chat-form]'
        ) as HTMLFormElement
        if (form) {
          form.requestSubmit()
        }
        onAutoSubmitComplete?.()
      }, 50)
    }
  }, [autoSubmitMessage, isLoading, onAutoSubmitComplete])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Capture the selected context for this request, then clear it
    const contextForThisRequest = selectedContext
    if (selectedContext && onClearContext) {
      onClearContext()
    }

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date(),
      context: contextForThisRequest || undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages
            .slice(-5)
            .map((m) => ({
              role: m.role,
              content: m.content,
            }))
            .concat([{ role: 'user', content: input }]),
          campaignContext,
          emailContext,
          selectedContext: contextForThisRequest,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      if (data.shouldEdit && data.edits && onApplyEdits) {
        onApplyEdits(data.edits)
      }

      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        appliedEdit: data.shouldEdit || false,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)

      const errorMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content:
          "I apologize, but I'm having trouble connecting right now. Please make sure your OpenAI API key is configured in .env.local and try again.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = useMemo(() => {
    const basicActions = [
      'Improve subject line',
      'Make it more engaging',
      'Add a strong CTA',
      'Shorten the content',
    ]

    if (!emailContext) {
      return basicActions
    }

    const discussedTopics = new Set(
      messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content.toLowerCase())
    )

    const dynamicActions: string[] = []
    const { subject = '', content = '', campaignType = '' } = emailContext
    const contentLength = content.length
    const hasCtaKeywords =
      /click|buy|shop|get|download|sign up|register|join|try|start|learn more/i.test(
        content
      )
    const hasUrgency = /now|today|limited|hurry|don't miss/i.test(content)
    const hasPersonalization = /\{name\}|\{first_name\}/i.test(content)
    const subjectLength = subject.length

    if (
      subjectLength > 60 &&
      !discussedTopics.has('subject') &&
      !discussedTopics.has('shorten')
    ) {
      dynamicActions.push('Subject line is too long')
    }

    if (
      !hasCtaKeywords &&
      !discussedTopics.has('cta') &&
      !discussedTopics.has('call to action')
    ) {
      dynamicActions.push('Missing clear call-to-action')
    }

    if (contentLength > 1000 && !discussedTopics.has('shorten')) {
      dynamicActions.push('Content is too long')
    } else if (contentLength < 200 && !discussedTopics.has('expand')) {
      dynamicActions.push('Add more value')
    }

    if (!hasUrgency && campaignType?.toLowerCase().includes('promo')) {
      dynamicActions.push('Add urgency for promo')
    }

    if (!hasPersonalization && !discussedTopics.has('personalization')) {
      dynamicActions.push('Make it more personal')
    }

    if (
      campaignType?.toLowerCase().includes('welcome') &&
      !discussedTopics.has('onboard')
    ) {
      dynamicActions.push('Improve onboarding flow')
    }

    if (
      campaignType?.toLowerCase().includes('nurture') &&
      !discussedTopics.has('value')
    ) {
      dynamicActions.push('Add educational content')
    }

    if (!discussedTopics.has('tone') && !discussedTopics.has('voice')) {
      dynamicActions.push('Adjust tone')
    }

    const combined = [...dynamicActions.slice(0, 2), ...basicActions]

    return combined
      .filter((action, index, self) => self.indexOf(action) === index)
      .slice(0, 4)
  }, [messages, emailContext])

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {campaignContext ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Full campaign context
                </span>
              ) : (
                'Always here to help'
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
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
                'p-3 max-w-[85%]',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.appliedEdit
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-muted'
              )}
            >
              {message.appliedEdit && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Email Updated
                  </span>
                </div>
              )}
              {message.context && (
                <div className="mb-2 pb-2 border-b border-primary-foreground/20">
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
                  'text-xs mt-2',
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
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <Card className="p-3 bg-muted">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {!isLoading && quickActions.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2">
            Suggested actions:
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="text-xs bg-transparent"
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border"
        data-chat-form
      >
        {selectedContext && (
          <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-primary">
                  {selectedContext.action}
                </span>
              </div>
              {onClearContext && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearContext}
                  className="h-5 w-5 p-0 hover:bg-primary/20"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50 max-h-24 overflow-y-auto">
              "{selectedContext.text}"
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
            data-ai-chat-input
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
