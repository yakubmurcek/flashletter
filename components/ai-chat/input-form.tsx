'use client'

import { memo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, X, Send } from 'lucide-react'
import type { SelectedContext } from '@/lib/types'

interface AIChatInputFormProps {
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  selectedContext?: SelectedContext | null
  onClearContext?: () => void
  onSubmit: (e: React.FormEvent) => void
}

function InputFormBase({
  input,
  setInput,
  isLoading,
  selectedContext,
  onClearContext,
  onSubmit,
}: AIChatInputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (selectedContext && inputRef.current && !isLoading) {
      // Use multiple timing strategies for maximum reliability
      const focusInput = () => {
        if (inputRef.current && !inputRef.current.disabled) {
          inputRef.current.focus()
          // Ensure cursor is at the end
          inputRef.current.setSelectionRange(
            inputRef.current.value.length,
            inputRef.current.value.length
          )
        }
      }

      // Try immediately
      focusInput()

      // Also try with requestAnimationFrame
      requestAnimationFrame(focusInput)

      // And with a small timeout as backup
      const timeoutId = setTimeout(focusInput, 50)

      return () => clearTimeout(timeoutId)
    }
  }, [selectedContext, isLoading])

  return (
    <form
      onSubmit={onSubmit}
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
            &quot;{selectedContext.text}&quot;
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
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

export const AIChatInputForm = memo(InputFormBase)
