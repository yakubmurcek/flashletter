import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layouts/app-shell'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is already logged in, redirect to home (guests may still sign up)
  if (user && !user.is_anonymous) {
    redirect('/')
  }

  return (
    <AppShell
      chrome="centered"
      homeHref="/"
    >
      <div className="w-full max-w-md">{children}</div>
    </AppShell>
  )
}
