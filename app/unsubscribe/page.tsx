'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/layouts/app-shell'
import { CheckCircle, AlertCircle, Mail, Trash2 } from 'lucide-react'
export default function UnsubscribePage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch('/api/waitlist/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult({
        type: 'success',
        message:
          'You have been successfully removed from our waitlist. You will no longer receive updates from us.',
      })
      setEmail('')
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell chrome="centered">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-display text-2xl md:text-3xl mb-2">Unsubscribe</h1>
          <p className="text-muted-foreground leading-relaxed">
            Remove your email from our waitlist
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Unsubscribe from Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleUnsubscribe}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {result && (
                <div
                  className={`p-3 rounded-md flex items-start gap-3 text-sm ${
                    result.type === 'success'
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'bg-destructive/10 border border-destructive/30 text-destructive'
                  }`}
                >
                  {result.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <p>{result.message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full"
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Unsubscribe
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{' '}
            <a
              href="mailto:support@flashletter.com"
              className="text-primary hover:underline"
            >
              support@flashletter.com
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  )
}
