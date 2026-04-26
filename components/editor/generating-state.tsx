'use client'

import { Loader2, Sparkles, AlertCircle } from 'lucide-react'

interface GeneratingStateProps {
  streamedCount: number
  totalExpected: number | null
  error: string | null
}

export function GeneratingState({ streamedCount, totalExpected, error }: GeneratingStateProps) {
  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Generation failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const showFirstHint = streamedCount === 0
  const progressLabel =
    totalExpected != null ? `${streamedCount} of ${totalExpected}` : `${streamedCount}`

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          {showFirstHint ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6 text-primary" />
          )}
        </div>
        <h2 className="text-display text-2xl mb-3">
          {showFirstHint ? 'Writing your first email…' : 'Filling out the sequence…'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {showFirstHint
            ? 'Reading your landing page and drafting Day 1. This usually takes a few seconds.'
            : 'Day 1 is ready. Generating the rest of the sequence in the background.'}
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular">{progressLabel} emails</p>
      </div>
    </div>
  )
}
