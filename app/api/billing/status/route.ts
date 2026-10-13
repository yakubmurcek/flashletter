import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { campaignsUsedThisMonth, getPlan } from '@/lib/billing/limits'
import { PLAN_LIMITS, currentPeriodStart } from '@/lib/billing/plans'
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
  // Counted the same way as checkCampaignAllowed, so /create can stop a user
  // before scraping instead of after.
  const { count: campaignRows } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', currentPeriodStart().toISOString())
  const campaignsThisMonth = await campaignsUsedThisMonth(user.id, campaignRows ?? 0)
  return NextResponse.json({
    plan,
    billingEnabled: isBillingEnabled(),
    campaignsThisMonth,
    limits: {
      campaignsPerMonth: Number.isFinite(limits.campaignsPerMonth)
        ? limits.campaignsPerMonth
        : null,
      maxEmailsPerCampaign: limits.maxEmailsPerCampaign,
    },
  })
}
