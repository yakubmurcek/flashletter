'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Progress for work with no real percentage (an LLM call): climbs quickly at
 * first, then ever more slowly towards `cap`, so it never sits still and never
 * claims to be finished. Reaches ~85% of `cap` at `expectedMs`.
 */
export function useEasedProgress(active: boolean, expectedMs: number, cap = 95) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }
    const start = Date.now()
    const tau = expectedMs / 1.9
    const id = setInterval(() => {
      const t = Date.now() - start
      setValue(cap * (1 - Math.exp(-t / tau)))
    }, 200)
    return () => clearInterval(id)
  }, [active, expectedMs, cap])

  return value
}

/** Cycles through `items` every `intervalMs` while `active`. */
export function useRotatingText(items: readonly string[], active: boolean, intervalMs = 3200) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
    if (!active || items.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs)
    return () => clearInterval(id)
  }, [items, active, intervalMs])

  return items[index] ?? ''
}

export function EasedProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10', className)}
    >
      <div
        className="relative h-full overflow-hidden rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 animate-progress-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
      </div>
    </div>
  )
}
