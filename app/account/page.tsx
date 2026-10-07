import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layouts/app-shell'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UpgradeButton } from '@/components/billing/upgrade-button'
import { PortalButton } from '@/components/billing/portal-button'
import { ResumeCheckout } from '@/components/billing/resume-checkout'
import { PLAN_LIMITS, PRO_PRICE_USD, currentPeriodStart } from '@/lib/billing/plans'
import {
  clearSubscriptionCache,
  getStripe,
  getSubscriptionSummary,
  isBillingEnabled,
  type SubscriptionSummary,
} from '@/lib/billing/stripe'

export const metadata: Metadata = {
  title: 'Account | Flashletter',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function formatDate(unixSeconds: number | null) {
  if (!unixSeconds) return null
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Confirms a just-finished Checkout belongs to this user and refreshes the plan. */
async function confirmCheckout(userId: string, sessionId: string | undefined): Promise<boolean> {
  if (!sessionId || !isBillingEnabled()) return false
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.client_reference_id !== userId || session.status !== 'complete') return false
    await clearSubscriptionCache(userId)
    return true
  } catch {
    return false
  }
}

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/account')
  if (user.is_anonymous) {
    const upgrade = params.upgrade === 'year' ? 'year' : params.upgrade === 'month' ? 'month' : null
    const resume = upgrade ? `/account?upgrade=${upgrade}` : '/account'
    redirect(`/signup?redirectTo=${encodeURIComponent(resume)}`)
  }

  const sessionId = typeof params.session_id === 'string' ? params.session_id : undefined
  const justUpgraded = params.checkout === 'success' && (await confirmCheckout(user.id, sessionId))

  let summary: SubscriptionSummary | null = null
  let billingError = false
  try {
    summary = await getSubscriptionSummary(user, { fresh: justUpgraded })
  } catch {
    billingError = true
  }
  const isPro = !!summary?.active

  const { count: campaignsThisMonth } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', currentPeriodStart().toISOString())

  const resumeInterval =
    !isPro && (params.upgrade === 'month' || params.upgrade === 'year') ? params.upgrade : null
  const renewal = formatDate(summary?.currentPeriodEnd ?? null)

  return (
    <AppShell
      chrome="narrow"
      backHref="/campaigns"
      backLabel="Campaigns"
      headerRight={<SignOutButton />}
    >
      <h1 className="text-display text-3xl md:text-5xl mb-2">Account</h1>
      <p className="text-muted-foreground mb-8">{user.email}</p>

      {justUpgraded && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <span>
            <strong className="font-semibold">Welcome to Pro.</strong> Unlimited campaigns are on. A
            receipt is on its way to your inbox.
          </span>
        </div>
      )}
      {resumeInterval && isBillingEnabled() && <ResumeCheckout interval={resumeInterval} />}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl">Plan</CardTitle>
            <Badge variant={isPro ? 'default' : 'secondary'}>{isPro ? 'Pro' : 'Free'}</Badge>
          </div>
          <CardDescription>
            {billingError
              ? 'We could not load your billing details right now. Please try again shortly.'
              : isPro
                ? summary?.cancelAtPeriodEnd
                  ? `Pro ends on ${renewal}. You can resume it anytime before then.`
                  : `Pro, billed ${summary?.interval === 'year' ? 'yearly' : 'monthly'}${
                      renewal ? `. Renews on ${renewal}.` : '.'
                    }`
                : `${campaignsThisMonth ?? 0} of ${PLAN_LIMITS.free.campaignsPerMonth} campaigns used this month.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <PortalButton />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <UpgradeButton interval="month">
                Pro monthly · ${PRO_PRICE_USD.month}/mo
              </UpgradeButton>
              <UpgradeButton
                interval="year"
                variant="outline"
              >
                Pro yearly · ${PRO_PRICE_USD.year}/yr
              </UpgradeButton>
            </div>
          )}
          {!isPro && summary?.customerId && (
            <div className="mt-4">
              <PortalButton>Invoices and payment details</PortalButton>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Compare plans on the{' '}
        <Button
          variant="link"
          className="h-auto p-0"
          asChild
        >
          <Link href="/pricing">pricing page</Link>
        </Button>
        . Questions about billing? Write to{' '}
        <a
          href="mailto:jakub@flashletter.app"
          className="text-primary hover:underline"
        >
          jakub@flashletter.app
        </a>
        .
      </p>
    </AppShell>
  )
}
