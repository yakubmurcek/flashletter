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
  /** False while the campaign is still loading; sending then would reach the AI without context. */
  contextReady?: boolean
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
  contextReady = true,
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
      className="p-4 border-t border-border bg-card"
      data-chat-form
    >
      {selectedContext && (
        <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
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
          <div className="text-xs text-muted-foreground bg-background p-2 rounded border border-border max-h-24 overflow-y-auto">
            &quot;{selectedContext.text}&quot;
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={contextReady ? 'Ask me anything...' : 'Loading your campaign...'}
          className="flex-1"
          disabled={isLoading || !contextReady}
          data-ai-chat-input
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !contextReady || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

export const AIChatInputForm = memo(InputFormBase)
