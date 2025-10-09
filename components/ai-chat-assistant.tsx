"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { X, Send, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIChatAssistantProps {
  onClose: () => void
}

export function AIChatAssistant({ onClose }: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. I can help you refine your email content, suggest improvements, or answer questions about your campaign. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const aiMessage: Message = {
      id: messages.length + 2,
      role: "assistant",
      content: getAIResponse(input),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, aiMessage])
    setIsLoading(false)
  }

  const quickActions = ["Improve subject line", "Make it more engaging", "Add a CTA", "Shorten the content"]

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
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "assistant" && (
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <Card
              className={cn(
                "p-3 max-w-[85%]",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  "text-xs mt-2",
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </Card>
            {message.role === "user" && (
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
      {messages.length <= 2 && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

// Mock AI response generator
function getAIResponse(input: string): string {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes("subject")) {
    return "I can help you improve your subject line! Here are some tips:\n\n• Keep it under 50 characters\n• Use action words\n• Create urgency or curiosity\n• Personalize when possible\n\nWould you like me to suggest a specific subject line for your current email?"
  }

  if (lowerInput.includes("engaging") || lowerInput.includes("improve")) {
    return "To make your email more engaging, consider:\n\n• Starting with a compelling hook\n• Using storytelling techniques\n• Adding social proof or testimonials\n• Breaking up text with bullet points\n• Including a clear, single call-to-action\n\nWhich email would you like me to help improve?"
  }

  if (lowerInput.includes("cta") || lowerInput.includes("call to action")) {
    return "A strong CTA should be:\n\n• Action-oriented (Start, Get, Join, etc.)\n• Specific about the benefit\n• Visually prominent\n• Create urgency when appropriate\n\nExample: 'Start Your Free Trial Today' or 'Get Instant Access Now'\n\nWhat action do you want readers to take?"
  }

  if (lowerInput.includes("shorten") || lowerInput.includes("shorter")) {
    return "I can help you make your content more concise! Here's how:\n\n• Remove redundant phrases\n• Use bullet points instead of paragraphs\n• Focus on one main message per email\n• Cut unnecessary adjectives\n\nShare the content you'd like me to shorten, and I'll provide a condensed version."
  }

  return "I understand you're looking for help with your email campaign. I can assist with:\n\n• Improving subject lines\n• Making content more engaging\n• Adding effective CTAs\n• Shortening or expanding content\n• Adjusting tone and style\n\nWhat specific aspect would you like to work on?"
}
