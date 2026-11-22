'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { CAMPAIGN_TONES, CAMPAIGN_TYPES, CAMPAIGN_DURATION } from '@/lib/constants/campaign'
import Link from 'next/link'
import { usePlan } from '@/lib/hooks/use-plan'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import type { CampaignConfig } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CampaignConfigPanelProps {
  config: CampaignConfig | null
  onConfigChange: (next: CampaignConfig) => void
  onRegenerate: () => void
  isStreaming: boolean
  streamedCount: number
  totalExpected: number | null
  defaultOpen?: boolean
  /** When there are emails to lose, Regenerate asks before replacing them. */
  hasEmails?: boolean
}

export function CampaignConfigPanel({
  config,
  onConfigChange,
  onRegenerate,
  isStreaming,
  streamedCount,
  totalExpected,
  defaultOpen = false,
  hasEmails = false,
}: CampaignConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const { plan, maxEmails } = usePlan()

  if (!config) {
    return null
  }

  const tone = config.tone
  const campaignType = config.campaignType
  const days = config.days

  const setTone = (next: string) => onConfigChange({ ...config, tone: next })
  const setType = (next: string) => onConfigChange({ ...config, campaignType: next })
  const setDays = (next: number) => onConfigChange({ ...config, days: next })

  const toneLabel = CAMPAIGN_TONES.find((t) => t.value === tone)?.label ?? tone
  const typeLabel = CAMPAIGN_TYPES.find((t) => t.value === campaignType)?.label ?? campaignType

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-6 py-3 text-left',
          'hover:bg-muted/40 transition-colors',
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 shrink-0">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap">
            Sequence settings
          </span>
        </div>
        <span className="min-w-0 text-xs text-muted-foreground truncate ml-3">
          {typeLabel} · {toneLabel} · {days}d
        </span>
      </button>

      {isOpen && (
        <div className="px-6 pb-5 pt-1 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tone</label>
            <Select
              value={tone}
              onValueChange={setTone}
              disabled={isStreaming}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TONES.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select
              value={campaignType}
              onValueChange={setType}
              disabled={isStreaming}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Length</label>
              <span className="text-sm font-medium tabular">{days} emails</span>
            </div>
            <Slider
              min={CAMPAIGN_DURATION.MIN}
              max={Math.min(CAMPAIGN_DURATION.MAX, maxEmails)}
              step={1}
              value={[days]}
              onValueChange={(v) => setDays(v[0])}
              disabled={isStreaming}
            />
            {plan !== 'pro' && plan !== null && (
              <p className="text-xs text-muted-foreground">
                Up to {maxEmails} emails on your plan.{' '}
                <Link
                  href="/pricing"
                  className="text-primary hover:underline"
                >
                  Pro writes up to {PLAN_LIMITS.pro.maxEmailsPerCampaign}
                </Link>
                .
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (hasEmails ? setConfirmRegenerate(true) : onRegenerate())}
            disabled={isStreaming}
            className="w-full"
          >
            {isStreaming ? (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse" />
                Generating
                {totalExpected ? ` ${streamedCount}/${totalExpected}` : null}…
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Regenerate sequence
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Regenerating replaces all emails. Edits made to existing emails will be lost.
          </p>
        </div>
      )}

      <AlertDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all emails?</AlertDialogTitle>
            <AlertDialogDescription>
              Claude writes a new sequence with these settings. Your current emails and any edits
              you made to them are replaced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my emails</AlertDialogCancel>
            <AlertDialogAction onClick={onRegenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
