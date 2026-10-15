'use client'

import Link from 'next/link'
import { Loader2, Sparkles, AlertCircle, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanId } from '@/lib/billing/plans'
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
  limitPlan?: PlanId | null
  /** Starts generation again after a failure. No button without it. */
  onRetry?: () => void
}

export function GeneratingState({
  streamedCount,
  totalExpected,
  error,
  limitPlan = null,
  onRetry,
}: GeneratingStateProps) {
  const showFirstHint = streamedCount === 0
  const firstProgress = useEasedProgress(!error && showFirstHint, 45_000)
  const restProgress = useEasedProgress(!error && !showFirstHint, 70_000)
  const hint = useRotatingText(showFirstHint ? FIRST_EMAIL_HINTS : SEQUENCE_HINTS, !error)

  if (error && limitPlan) {
    const isGuest = limitPlan === 'guest'
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-display text-2xl mb-2">
            {isGuest ? 'Save your work to keep going' : 'You\u2019ve hit this month\u2019s limit'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link href={isGuest ? '/signup' : '/pricing'}>
              {isGuest ? 'Create a free account' : 'Upgrade to Pro'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Generation failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button
              className="mt-6"
              onClick={onRetry}
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </Button>
          )}
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
