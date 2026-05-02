'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { SendTestEmailResponse } from '@/lib/schemas/api'
import { createClient } from '@/lib/supabase/client'

interface SendTestDialogProps {
  campaignId: string
  emailDay: number
  emailSubject: string
  trigger: React.ReactNode
}

type UserState =
  | { status: 'loading' }
  | { status: 'authed'; email: string }
  | { status: 'anonymous' }
  | { status: 'unauthenticated' }

export function SendTestDialog({
  campaignId,
  emailDay,
  emailSubject,
  trigger,
}: SendTestDialogProps) {
  const [open, setOpen] = useState(false)
  const [userState, setUserState] = useState<UserState>({ status: 'loading' })
  const [emailInput, setEmailInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        setUserState({ status: 'unauthenticated' })
      } else if (user.is_anonymous || !user.email) {
        setUserState({ status: 'anonymous' })
      } else {
        setUserState({ status: 'authed', email: user.email })
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body: { campaignId: string; emailDay: number; recipientEmail?: string } = {
        campaignId,
        emailDay,
      }
      if (userState.status === 'anonymous') {
        const trimmed = emailInput.trim()
        if (!trimmed) {
          toast.error('Enter your email so we know where to send it.')
          setSubmitting(false)
          return
        }
        body.recipientEmail = trimmed
      }

      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { message?: string; error?: string })
        const msg =
          data.message ||
          (res.status === 429
            ? 'Hit the rate limit — try again shortly.'
            : "Couldn't send right now. Try again in a moment.")
        toast.error(msg)
        setSubmitting(false)
        return
      }

      const data = (await res.json()) as SendTestEmailResponse
      const successMsg = data.upgradeStarted
        ? `Sent to ${data.sentTo} — and a confirmation link to save your campaign.`
        : `Sent to ${data.sentTo}. Check your inbox in a few seconds.`
      toast.success(successMsg)
      setOpen(false)
      setEmailInput('')
    } catch (err) {
      console.error('Failed to send test email:', err)
      toast.error("Couldn't send right now. Try again in a moment.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to your inbox</DialogTitle>
          <DialogDescription>
            See how <span className="font-medium text-foreground">{emailSubject}</span> looks in a
            real inbox before you push it anywhere.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {userState.status === 'loading' ? (
            <div className="h-10 flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Checking your account…
            </div>
          ) : userState.status === 'authed' ? (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              Sending to{' '}
              <span className="font-medium text-foreground">{userState.email}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Your email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll also send you a confirmation link so this campaign stays saved.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || userState.status === 'loading'}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send test
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
