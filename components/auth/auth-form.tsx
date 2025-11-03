'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        setMessage(
          'Check your email for a confirmation link to complete your registration.'
        )
        setLoading(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Get redirect URL from query params or default to home
        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirectTo') || '/'
        router.push(redirectTo)
        // Don't reset loading state - let the page navigation handle it
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          minLength={6}
        />
        {mode === 'signup' && (
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {message && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {message}
        </div>
      )}

      {mode === 'signup' && (
        <p className="text-xs text-center text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link
            href="/terms"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-all duration-300"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
          </>
        ) : mode === 'signup' ? (
          'Create Account'
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  )
}
