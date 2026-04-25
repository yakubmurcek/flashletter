'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import {
  SCRAPE_PROGRESS_STAGES,
  ProgressState,
  formatProgressMessage,
  ProgressStage,
} from '@/lib/types/scrape-progress'
import { cn } from '@/lib/utils'

interface ScrapeProgressOverlayProps {
  isOpen: boolean
  progressState: ProgressState
}

export function ScrapeProgressOverlay({ isOpen, progressState }: ScrapeProgressOverlayProps) {
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

  if (!isOpen) return null

  // Find index of current stage
  const currentStageIndex = SCRAPE_PROGRESS_STAGES.findIndex(
    (s) => s.id === progressState.currentStageId,
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-lg">
            <div className="bg-card border border-border/50 shadow-2xl rounded-2xl p-6 md:p-8 space-y-8 overflow-hidden relative">
              {/* Decorative background glow */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Analyzing Landing Page
                </h3>
                <p className="text-center text-muted-foreground mb-8 text-sm">
                  We&apos;re building your campaign context...
                </p>

                <div className="space-y-4">
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
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ProgressStep({
  stage,
  state,
  context,
}: {
  stage: ProgressStage
  state: 'completed' | 'current' | 'pending'
  context: ProgressState['dynamicContext']
}) {
  const message = formatProgressMessage(stage.messageTemplate, context)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-colors border',
        state === 'current'
          ? 'bg-primary/5 border-primary/20 shadow-sm'
          : 'bg-transparent border-transparent',
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
          state === 'completed'
            ? 'bg-green-500 text-white scale-100'
            : state === 'current'
              ? 'bg-primary text-primary-foreground scale-110'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {state === 'completed' ? (
          <Check className="w-5 h-5" />
        ) : state === 'current' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
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
      </div>
    </motion.div>
  )
}
