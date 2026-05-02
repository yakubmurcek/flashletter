'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface UpgradePromptProps {
  campaignCount?: number
  redirectTo?: string
  initialError?: string | null
}

export function UpgradePrompt({
  campaignCount = 1,
  redirectTo = '/create',
  initialError = null,
}: UpgradePromptProps) {
  const router = useRouter()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const anyLoading = oauthLoading || emailLoading

  const handleGoogleSignUp = async () => {
    setOauthLoading(true)
    setError(null)
    setPendingMessage(null)

    try {
      const supabase = createClient()
      const callbackUrl = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`

      // Link anonymous account to Google identity
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) throw error

      // Redirect to Google OAuth
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error linking identity:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect Google account')
      setOauthLoading(false)
    }
  }

  // Upgrades the current anonymous user to a real email-credentialed account
  // by attaching email + password via `updateUser`. Same `user.id` is preserved
  // (that's the whole point — campaigns stay linked), no OAuth round-trip
  // required, which makes the flow scriptable end-to-end for testing.
  //
  // If the project has email confirmations enabled, `updateUser` returns
  // success but leaves the session in a pending state until the confirmation
  // link is clicked. We detect this via `data.user?.is_anonymous` still being
  // true and surface a clear message rather than redirecting into the
  // post-signup experience prematurely.
  const handleEmailUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError(null)
    setPendingMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.updateUser({ email, password })

      if (error) throw error

      const upgraded = data.user && data.user.is_anonymous === false
      if (upgraded) {
        router.push(redirectTo)
        return
      }

      // Confirmation flow — auth completes when the user clicks the email link.
      setPendingMessage(
        'Check your inbox for a confirmation link to finish setting up your account. Your campaigns are saved.',
      )
    } catch (err) {
      console.error('Error upgrading anonymous user with email:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full bg-card border border-border shadow-sm rounded-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-display text-2xl md:text-3xl">
            You&apos;ve created your first campaign!
          </CardTitle>
          <CardDescription className="mt-2">
            Sign up to save your work and create unlimited campaigns.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{campaignCount} campaign</span>{' '}
              created • <span className="text-primary font-medium">Free trial used</span>
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
              {error}
            </div>
          )}

          {pendingMessage && (
            <div className="p-3 text-sm text-foreground bg-primary/10 border border-primary/30 rounded-md">
              {pendingMessage}
            </div>
          )}

          <Button
            onClick={handleGoogleSignUp}
            disabled={anyLoading}
            size="lg"
            className="w-full"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continue with Google
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute inset-x-0 -top-2 flex justify-center text-xs uppercase tracking-widest text-muted-foreground">
              <span className="bg-card px-2">Or with email</span>
            </span>
          </div>

          <form
            onSubmit={handleEmailUpgrade}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="upgrade-email">Email</Label>
              <Input
                id="upgrade-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={anyLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upgrade-password">Password</Label>
              <Input
                id="upgrade-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={anyLoading}
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={anyLoading}
              className="w-full"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Your campaign will be saved and linked to your new account.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
      {...props}
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.72h5.26c-.21 1.34-.95 2.48-2.03 3.24l3.29 2.56c1.92-1.77 3.03-4.38 3.03-7.47 0-.72-.06-1.42-.18-2.08H12z"
      />
      <path
        fill="#34A853"
        d="M6.64 13.53l-.83.64-2.62 2.04C4.79 19.99 8.13 22.5 12 22.5c2.7 0 4.97-.89 6.63-2.39l-3.29-2.56c-.87.6-1.99.95-3.34.95-2.56 0-4.73-1.73-5.5-4.08z"
      />
      <path
        fill="#4A90E2"
        d="M3.19 7.79C2.43 9.14 2 10.71 2 12.38c0 1.66.43 3.25 1.19 4.59l3.45-2.86c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.96c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.96 2.66 14.7 1.5 12 1.5c-3.87 0-7.21 2.51-8.81 6.11l3.45 2.86C7.27 7.69 9.44 5.96 12 5.96z"
      />
    </svg>
  )
}
