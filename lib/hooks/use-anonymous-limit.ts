'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AnonymousLimitState {
  isLoading: boolean
  isAnonymous: boolean
  campaignCount: number
  canCreate: boolean
  user: User | null
}

const ANONYMOUS_CAMPAIGN_LIMIT = 1

/**
 * Hook to check if an anonymous user has reached their free campaign limit.
 * Returns loading state, anonymous status, and whether they can create more campaigns.
 */
export function useAnonymousLimit(): AnonymousLimitState {
  const [state, setState] = useState<AnonymousLimitState>({
    isLoading: true,
    isAnonymous: false,
    campaignCount: 0,
    canCreate: true,
    user: null,
  })

  useEffect(() => {
    async function checkLimit() {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setState({
          isLoading: false,
          isAnonymous: false,
          campaignCount: 0,
          canCreate: true,
          user: null,
        })
        return
      }

      // Check if user is anonymous
      const isAnonymous = user.is_anonymous ?? false

      if (!isAnonymous) {
        // Authenticated users have no limit (for now)
        setState({
          isLoading: false,
          isAnonymous: false,
          campaignCount: 0,
          canCreate: true,
          user,
        })
        return
      }

      // Count campaigns for anonymous user
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error counting campaigns:', error)
        // On error, allow creation to not block the user
        setState({
          isLoading: false,
          isAnonymous: true,
          campaignCount: 0,
          canCreate: true,
          user,
        })
        return
      }

      const campaignCount = count ?? 0
      const canCreate = campaignCount < ANONYMOUS_CAMPAIGN_LIMIT

      setState({
        isLoading: false,
        isAnonymous: true,
        campaignCount,
        canCreate,
        user,
      })
    }

    checkLimit()
  }, [])

  return state
}
