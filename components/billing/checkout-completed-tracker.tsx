'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'
import type { BillingInterval } from '@/lib/billing/plans'

const storageKey = (sessionId: string) => `fl_checkout_completed_${sessionId}`

function alreadyTracked(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(sessionId)) === '1'
  } catch {
    return false
  }
}

function markTracked(sessionId: string) {
  try {
    window.localStorage.setItem(storageKey(sessionId), '1')
  } catch {
    // Private mode or blocked storage: a reload may count twice, which beats never counting.
  }
}

/**
 * Fires `checkout_completed` once per paid Checkout session. The ref covers
 * StrictMode's double mount; storage covers a reload of the success URL.
 */
export function CheckoutCompletedTracker({
  sessionId,
  interval,
}: {
  sessionId: string
  interval: BillingInterval | null
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    if (alreadyTracked(sessionId)) return
    markTracked(sessionId)
    track('checkout_completed', { interval })
  }, [sessionId, interval])

  return null
}
