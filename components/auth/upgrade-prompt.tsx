'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface UpgradePromptProps {
  campaignCount?: number
}

export function UpgradePrompt({ campaignCount = 1 }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Link anonymous account to Google identity
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=/create`,
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
      setLoading(false)
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

          <Button
            onClick={handleGoogleSignUp}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
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
