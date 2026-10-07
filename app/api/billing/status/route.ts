import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlan } from '@/lib/billing/limits'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { isBillingEnabled } from '@/lib/billing/stripe'

/** The signed-in user's plan, for upgrade prompts and the header badge. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ plan: null, billingEnabled: isBillingEnabled() })

  const plan = await getPlan(user)
  const limits = PLAN_LIMITS[plan]
  return NextResponse.json({
    plan,
    billingEnabled: isBillingEnabled(),
    limits: {
      campaignsPerMonth: Number.isFinite(limits.campaignsPerMonth)
        ? limits.campaignsPerMonth
        : null,
      maxEmailsPerCampaign: limits.maxEmailsPerCampaign,
    },
  })
}
