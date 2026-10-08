import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/layouts/app-shell'
import { Mail, User, Calendar, Hash } from 'lucide-react'

export const metadata = {
  title: 'Waitlist Admin',
  description: 'View waitlist entries',
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export default async function WaitlistAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Gate by an explicit allow-list. With no list configured we 404 the page
  // entirely rather than expose waitlist PII to every authenticated user.
  const adminEmails = getAdminEmails()
  const userEmail = user.email?.toLowerCase() ?? ''
  if (adminEmails.length === 0 || !adminEmails.includes(userEmail)) {
    notFound()
  }

  const { data: waitlistEntries, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching waitlist:', error)
  }

  const totalEntries = waitlistEntries?.length || 0
  const pendingEntries = waitlistEntries?.filter((entry) => entry.status === 'pending').length || 0

  return (
    <AppShell chrome="default">
      <div className="mb-8">
        <h1 className="text-display text-3xl md:text-4xl mb-2">Waitlist</h1>
        <p className="text-muted-foreground">Manage waitlist entries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-display text-3xl">{totalEntries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-display text-3xl">{pendingEntries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-display text-3xl">{totalEntries - pendingEntries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {waitlistEntries && waitlistEntries.length > 0 ? (
            <div className="space-y-4">
              {waitlistEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{entry.email}</span>
                      </div>
                      {entry.name && (
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{entry.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`capitalize px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'pending'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {entry.status}
                    </span>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No waitlist entries yet.</div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
