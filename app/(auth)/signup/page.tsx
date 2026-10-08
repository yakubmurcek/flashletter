import { PLAN_LIMITS } from '@/lib/billing/plans'
import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'
import { UpgradePrompt } from '@/components/auth/upgrade-prompt'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata = {
  title: 'Create your account',
  description: 'Create a new account',
}

function safeRedirect(target: string | string[] | undefined, fallback: string) {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) {
    return fallback
  }
  return target.startsWith('/\\') ? fallback : target
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { redirectTo } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A guest already has campaigns on an anonymous user; signing up fresh would
  // orphan them, so upgrade that user in place instead.
  if (user?.is_anonymous) {
    return (
      <UpgradePrompt
        variant="save"
        redirectTo={safeRedirect(redirectTo, '/campaigns')}
      />
    )
  }

  return (
    <Card className="bg-card border border-border shadow-sm rounded-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-display text-2xl md:text-3xl">
          <h1>Create an account</h1>
        </CardTitle>
        <CardDescription>
          Free plan: {PLAN_LIMITS.free.campaignsPerMonth} campaigns a month. No credit card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="signup" />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
