'use client'

import { Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyCampaignStateProps {
  onGenerate: () => void
  disabled?: boolean
}

/** A saved campaign whose emails were never written (e.g. it hit a plan limit). */
export function EmptyCampaignState({ onGenerate, disabled }: EmptyCampaignStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-2">No emails yet</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This campaign has its landing page and settings, but the emails were never written.
        </p>
        <Button
          onClick={onGenerate}
          disabled={disabled}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Write the emails
        </Button>
      </div>
    </div>
  )
}
