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
  shouldFocus?: boolean
  onFocusHandled?: () => void
}

function InputFormBase({
  input,
  setInput,
  isLoading,
  selectedContext,
  onClearContext,
  onSubmit,
  shouldFocus = false,
  onFocusHandled,
}: AIChatInputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shouldFocus || !inputRef.current || isLoading) {
      return
    }

    let handled = false
    const markHandled = () => {
      if (!handled) {
        handled = true
        onFocusHandled?.()
      }
    }

    const focusInput = () => {
      if (inputRef.current && !inputRef.current.disabled) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length,
        )
      }
    }

    focusInput()
    const rafId = requestAnimationFrame(focusInput)
    const timeoutId = setTimeout(() => {
      focusInput()
      markHandled()
    }, 50)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      markHandled()
    }
  }, [shouldFocus, isLoading, onFocusHandled])

  return (
    <form
      onSubmit={onSubmit}
      className="p-4 border-t border-border/40 bg-gradient-to-t from-primary/5 to-transparent"
      data-chat-form
    >
      {selectedContext && (
        <div className="mb-3 p-3 bg-gradient-to-r from-primary/10 to-amber-400/5 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              </div>
              <span className="text-xs font-semibold text-primary">{selectedContext.action}</span>
            </div>
            {onClearContext && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearContext}
                className="h-5 w-5 p-0 hover:bg-primary/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/40 max-h-24 overflow-y-auto">
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
          className="flex-1 border-border/60 focus:border-primary/50 transition-colors"
          disabled={isLoading}
          data-ai-chat-input
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-transform duration-300"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

export const AIChatInputForm = memo(InputFormBase)
