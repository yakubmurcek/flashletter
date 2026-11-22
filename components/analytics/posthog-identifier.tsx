'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { identify, resetAnalytics } from '@/lib/analytics'

/**
 * Mirrors the current Supabase user.id into PostHog as the distinct_id.
 *
 * - Fires once on mount with whatever the current session is (anonymous or
 *   authenticated).
 * - Re-fires on auth state changes so a `linkIdentity` upgrade keeps the
 *   distinct_id stable (Supabase preserves user.id across linking, so the
 *   id we identify with stays the same — that's the point).
 * - Resets PostHog on sign-out so the next user in this browser starts clean.
 *
 * Does no work if PostHog isn't initialized (env var unset). Cheap to mount;
 * one network call per session.
 */
export function PostHogIdentifier() {
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        identify(
          user.id,
          { is_anonymous: user.is_anonymous ?? false },
          { createdAt: user.created_at },
        )
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        resetAnalytics()
        return
      }
      if (session?.user?.id) {
        identify(
          session.user.id,
          { is_anonymous: session.user.is_anonymous ?? false },
          { createdAt: session.user.created_at },
        )
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  return null
}
