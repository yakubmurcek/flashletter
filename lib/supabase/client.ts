import { createBrowserClient } from '@supabase/ssr'
import { supabaseEnv } from './env'

export function createClient() {
  const { url, anonKey } = supabaseEnv()
  return createBrowserClient(url, anonKey)
}

/**
 * Sign in anonymously - creates a temporary user session.
 * The user can later link their account to Google to preserve their data.
 */
export async function signInAnonymously() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  return data
}
