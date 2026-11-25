'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import {
  SCRAPE_PROGRESS_STAGES,
  type ProgressState,
  formatProgressMessage,
  type ProgressStage,
} from '@/lib/types/scrape-progress'
import { cn } from '@/lib/utils'
import { EasedProgressBar, useEasedProgress, useRotatingText } from '@/components/ui/eased-progress'

// The analysis step is one long model call; rotate what it is looking at so
// the dialog keeps visibly moving.
const ANALYSIS_HINTS = [
  'Finding the main promise',
  'Working out who it is for',
  'Collecting proof and numbers',
  'Noting likely objections',
  'Picking angles for each email',
] as const

interface ScrapeProgressOverlayProps {
  isOpen: boolean
  progressState: ProgressState
}

export function ScrapeProgressOverlay({ isOpen, progressState }: ScrapeProgressOverlayProps) {
  // Portal to <body>: the hero's entrance animation leaves a transform on its
  // wrapper, which would otherwise become the containing block for `fixed`.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const currentStageIndex = SCRAPE_PROGRESS_STAGES.findIndex(
    (s) => s.id === progressState.currentStageId,
  )
  const inModelStage =
    progressState.currentStageId === 'analyzing' || progressState.currentStageId === 'synthesizing'
  const eased = useEasedProgress(isOpen, 35_000)
  const stageFloor = (progressState.completedStageIds.length / SCRAPE_PROGRESS_STAGES.length) * 90
  const hint = useRotatingText(ANALYSIS_HINTS, isOpen && inModelStage)

  if (!isOpen || !mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 text-left"
        >
          <div className="w-full max-w-md">
            <div className="bg-card border border-border shadow-xl rounded-2xl p-6 md:p-7 max-h-[90vh] overflow-y-auto">
              <div>
                <h3 className="text-display text-xl text-center mb-1.5 text-foreground">
                  Reading your landing page
                </h3>
                <p className="text-center text-muted-foreground mb-4 text-sm">
                  Your first email starts writing right after this.
                </p>
                <EasedProgressBar
                  value={Math.max(eased, stageFloor)}
                  className="mb-5"
                />

                <div className="space-y-1.5">
                  {SCRAPE_PROGRESS_STAGES.map((stage, index) => {
                    const isCompleted = progressState.completedStageIds.includes(stage.id)
                    const isCurrent = stage.id === progressState.currentStageId

                    // Only show stages up to current + 1 (preview next step)
                    if (index > currentStageIndex + 1) return null

                    return (
                      <ProgressStep
                        key={stage.id}
                        stage={stage}
                        state={isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}
                        context={progressState.dynamicContext}
                        hint={isCurrent && inModelStage ? hint : undefined}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ProgressStep({
  stage,
  state,
  context,
  hint,
}: {
  stage: ProgressStage
  state: 'completed' | 'current' | 'pending'
  context: ProgressState['dynamicContext']
  hint?: string
}) {
  const message = formatProgressMessage(stage.messageTemplate, context)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border',
        state === 'current'
          ? 'bg-primary/5 border-primary/20 shadow-sm'
          : 'bg-transparent border-transparent',
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300',
          state === 'completed'
            ? 'bg-primary text-primary-foreground scale-100'
            : state === 'current'
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {state === 'completed' ? (
          <Check className="w-4 h-4" />
        ) : state === 'current' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-current opacity-40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-none transition-colors duration-300 truncate',
            state === 'completed'
              ? 'text-muted-foreground/80'
              : state === 'current'
                ? 'text-foreground'
                : 'text-muted-foreground/50',
          )}
        >
          {message}
        </p>
        {hint && (
          <AnimatePresence mode="wait">
            <motion.p
              key={hint}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5 text-xs text-muted-foreground truncate"
            >
              {hint}…
            </motion.p>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
