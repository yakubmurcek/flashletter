'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, User, Loader2 } from 'lucide-react'
import { AnimatedSection, PulseButton } from '@/components/ui/animations'

interface WaitlistFormProps {
  className?: string
}

export function WaitlistForm({ className = '' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name: name || null }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      setIsSubmitted(true)
      setEmail('')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={`relative animate-success-bounce ${className}`}>
        {/* Confetti effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.4s' }}
          ></div>
          <div
            className="absolute top-0 left-3/4 w-2 h-2 bg-orange-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.6s' }}
          ></div>
          <div
            className="absolute top-0 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-confetti"
            style={{ animationDelay: '0.8s' }}
          ></div>
          <div
            className="absolute top-0 left-2/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-confetti"
            style={{ animationDelay: '1s' }}
          ></div>
        </div>

        <div className="relative text-center p-8 bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-800 overflow-hidden">
          {/* Sparkle decorations */}
          <div
            className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
            style={{ animationDelay: '0.5s' }}
          ></div>
          <div
            className="absolute top-6 right-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-sparkle"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute bottom-4 left-6 w-1 h-1 bg-yellow-500 rounded-full animate-sparkle"
            style={{ animationDelay: '1.5s' }}
          ></div>
          <div
            className="absolute bottom-6 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
            style={{ animationDelay: '2s' }}
          ></div>

          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-checkmark-pulse" />
          <h3
            className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2 animate-fade-in-up"
            style={{ animationDelay: '0.8s' }}
          >
            You're on the list!
          </h3>
          <p
            className="text-green-600 dark:text-green-400 animate-fade-in-up"
            style={{ animationDelay: '1.2s' }}
          >
            We'll notify you as soon as Flashletter is ready. Get ready for
            lightning-fast email campaigns!
          </p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedSection delay={0} immediate>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Join the Waitlist</h2>
          <p className="text-muted-foreground text-lg">
            Be the first to create lightning-fast AI email campaigns
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name (optional)
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <PulseButton>
          <Button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full h-12 text-base bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining Waitlist...
              </>
            ) : (
              'Join the Waitlist'
            )}
          </Button>
        </PulseButton>

        <p className="text-xs text-muted-foreground text-center">
          We respect your privacy. No spam, just updates about Flashletter.
        </p>
      </form>
    </AnimatedSection>
  )
}
