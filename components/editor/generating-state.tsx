'use client'

import { Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { EasedProgressBar, useEasedProgress, useRotatingText } from '@/components/ui/eased-progress'

const FIRST_EMAIL_HINTS = [
  'Picking the angle for Day 1',
  'Writing the subject line',
  'Drafting the opening',
  'Turning features into benefits',
  'Adding the call to action',
  'Polishing the copy',
] as const

const SEQUENCE_HINTS = [
  'Planning the rest of the sequence',
  'Writing the story email',
  'Adding social proof',
  'Handling objections',
  'Writing the closing email',
] as const

interface GeneratingStateProps {
  streamedCount: number
  totalExpected: number | null
  error: string | null
}

export function GeneratingState({ streamedCount, totalExpected, error }: GeneratingStateProps) {
  const showFirstHint = streamedCount === 0
  const firstProgress = useEasedProgress(!error && showFirstHint, 45_000)
  const restProgress = useEasedProgress(!error && !showFirstHint, 70_000)
  const hint = useRotatingText(showFirstHint ? FIRST_EMAIL_HINTS : SEQUENCE_HINTS, !error)

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

  const progressLabel =
    totalExpected != null ? `${streamedCount} of ${totalExpected}` : `${streamedCount}`

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
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
            ? 'Drafting Day 1 from your landing page. This usually takes under a minute.'
            : 'Day 1 is ready. Generating the rest of the sequence in the background.'}
        </p>
        <EasedProgressBar
          value={showFirstHint ? firstProgress : restProgress}
          className="mb-3"
        />
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <AnimatePresence mode="wait">
            <motion.span
              key={hint}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {hint}…
            </motion.span>
          </AnimatePresence>
          <span className="font-mono tabular shrink-0">{progressLabel} emails</span>
        </div>
      </div>
    </div>
  )
}
