import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, User, Calendar, Hash } from 'lucide-react'

export const metadata = {
  title: 'Waitlist Admin - Flashletter',
  description: 'View waitlist entries',
}

export default async function WaitlistAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Simple auth check - you might want to add proper admin role checking
  if (!user) {
    redirect('/login')
  }

  const { data: waitlistEntries, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('order', { ascending: true })

  if (error) {
    console.error('Error fetching waitlist:', error)
  }

  const totalEntries = waitlistEntries?.length || 0
  const pendingEntries =
    waitlistEntries?.filter((entry) => entry.status === 'pending').length || 0

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Waitlist Admin</h1>
          <p className="text-muted-foreground">Manage waitlist entries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Entries
              </CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalEntries - pendingEntries}
              </div>
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
                    className="flex items-center justify-between p-4 border rounded-lg"
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
                            <span className="text-sm text-muted-foreground">
                              {entry.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={
                          entry.status === 'pending' ? 'secondary' : 'default'
                        }
                      >
                        {entry.status}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No waitlist entries yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
