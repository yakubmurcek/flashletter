'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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

// Guests (anonymous or signed out) can't send: the route only ever mails the
// signed-in user's own account email, so they get an account prompt instead.
type UserState =
  | { status: 'loading' }
  | { status: 'authed'; email: string }
  | { status: 'guest'; signupHref: string }

const GUEST_MESSAGE = 'Create a free account to send test emails.'

export function SendTestDialog({
  campaignId,
  emailDay,
  emailSubject,
  trigger,
}: SendTestDialogProps) {
  const [open, setOpen] = useState(false)
  const [userState, setUserState] = useState<UserState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user || user.is_anonymous || !user.email) {
        const back = window.location.pathname + window.location.search
        setUserState({
          status: 'guest',
          signupHref: `/signup?redirectTo=${encodeURIComponent(back)}`,
        })
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
    if (userState.status !== 'authed') return
    setSubmitting(true)
    try {
      const body = { campaignId, emailDay }

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
            ? 'Hit the rate limit. Try again shortly.'
            : res.status === 401 && data.error
              ? data.error
              : "Couldn't send right now. Try again in a moment.")
        toast.error(msg)
        setSubmitting(false)
        return
      }

      const data = (await res.json()) as SendTestEmailResponse
      toast.success(`Sent to ${data.sentTo}. Check your inbox in a few seconds.`)
      setOpen(false)
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
              Sending to <span className="font-medium text-foreground">{userState.email}</span>
            </div>
          ) : (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <p>{GUEST_MESSAGE}</p>
            </div>
          )}

          <DialogFooter>
            {userState.status === 'guest' ? (
              <Button asChild>
                <Link href={userState.signupHref}>Create a free account</Link>
              </Button>
            ) : (
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
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
