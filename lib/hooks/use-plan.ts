'use client'

import { useEffect, useState } from 'react'
import { PLAN_LIMITS, type PlanId } from '@/lib/billing/plans'

/** The signed-in user's plan, fetched once; null until known. */
export function usePlan(): { plan: PlanId | null; maxEmails: number } {
  const [plan, setPlan] = useState<PlanId | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/billing/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { plan?: PlanId | null } | null) => {
        if (!cancelled && data?.plan) setPlan(data.plan)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return { plan, maxEmails: PLAN_LIMITS[plan ?? 'free'].maxEmailsPerCampaign }
}
