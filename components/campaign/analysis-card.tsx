'use client'

import { useState, type ChangeEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sparkles, Pencil, Check } from 'lucide-react'
import type { LandingPageAnalysis } from '@/lib/schemas/analysis'

interface AnalysisCardProps {
  analysis: LandingPageAnalysis
  onChange: (next: LandingPageAnalysis) => void
}

function linesToList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-•\s]+/, '').trim())
    .filter((line) => line.length > 0)
}

function listToLines(items: string[]): string {
  return items.join('\n')
}

function TextField({
  label,
  value,
  editing,
  onChange,
  hint,
}: {
  label: string
  value: string
  editing: boolean
  onChange: (next: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {editing ? (
        <Textarea
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          rows={2}
          className="resize-none"
        />
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {value || <span className="text-muted-foreground italic">Not detected</span>}
        </p>
      )}
    </div>
  )
}

function ListField({
  label,
  items,
  editing,
  onChange,
  hint,
  emptyMessage,
}: {
  label: string
  items: string[]
  editing: boolean
  onChange: (next: string[]) => void
  hint?: string
  emptyMessage: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {editing ? (
        <Textarea
          value={listToLines(items)}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(linesToList(e.target.value))}
          rows={Math.max(2, items.length + 1)}
          placeholder="One per line"
          className="resize-none font-mono text-xs"
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <li
              key={`${label}-${index}`}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-foreground/80"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AnalysisCard({ analysis, onChange }: AnalysisCardProps) {
  const [editing, setEditing] = useState(false)

  const update = <K extends keyof LandingPageAnalysis>(key: K, value: LandingPageAnalysis[K]) => {
    onChange({ ...analysis, [key]: value })
  }

  return (
    <Card className="p-6 md:p-8 border-border/60 bg-gradient-to-br from-primary/3 via-transparent to-amber-500/3">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">AI insights from your landing page</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              These feed directly into your emails. Tweak anything that&apos;s off.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={editing ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditing((prev) => !prev)}
          className="shrink-0"
        >
          {editing ? (
            <>
              <Check className="w-4 h-4" />
              Done
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4" />
              Edit
            </>
          )}
        </Button>
      </div>

      <div className="space-y-5">
        <TextField
          label="Value proposition"
          value={analysis.valueProp}
          editing={editing}
          onChange={(v) => update('valueProp', v)}
          hint="One sentence"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Target audience"
            value={analysis.targetAudience}
            editing={editing}
            onChange={(v) => update('targetAudience', v)}
          />
          <TextField
            label="Primary CTA"
            value={analysis.primaryCTA}
            editing={editing}
            onChange={(v) => update('primaryCTA', v)}
            hint="Every email drives to this"
          />
        </div>

        <TextField
          label="Voice to match"
          value={analysis.toneFingerprint}
          editing={editing}
          onChange={(v) => update('toneFingerprint', v)}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <ListField
            label="Proof points"
            items={analysis.proofPoints}
            editing={editing}
            onChange={(v) => update('proofPoints', v)}
            hint="Cited verbatim"
            emptyMessage="No concrete proof on the page — emails will stay general."
          />
          <ListField
            label="Angles to rotate"
            items={analysis.angles}
            editing={editing}
            onChange={(v) => update('angles', v)}
            hint="One per email"
            emptyMessage="Not detected."
          />
          <ListField
            label="Objections to pre-answer"
            items={analysis.objections}
            editing={editing}
            onChange={(v) => update('objections', v)}
            emptyMessage="None detected on the page."
          />
          <ListField
            label="Gaps to fill"
            items={analysis.opportunities}
            editing={editing}
            onChange={(v) => update('opportunities', v)}
            hint="Things the page omits"
            emptyMessage="Page is comprehensive."
          />
        </div>
      </div>
    </Card>
  )
}
