import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Mail, Calendar, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const metadata = {
  title: 'My Campaigns - Newsletter Generator',
  description: 'Manage your email campaigns',
}

export default async function CampaignsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const campaignService = new CampaignStorageService(supabase)
  const campaigns = await campaignService.listCampaigns(user.id)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">CampaignAI</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Campaigns</h1>
              <p className="text-muted-foreground">
                Manage and view all your email campaigns
              </p>
            </div>
            <Button asChild size="lg" className="gap-2">
              <Link href="/create">
                <Plus className="w-4 h-4" />
                New Campaign
              </Link>
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first email campaign
                </p>
                <Button asChild>
                  <Link href="/create">Create Your First Campaign</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">
                      {campaign.name || 'Untitled Campaign'}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {campaign.landing_page_url || 'No URL'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2 text-sm">
                      {campaign.campaign_type && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">
                            {campaign.campaign_type}
                          </span>
                        </div>
                      )}
                      {campaign.days && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{campaign.days} days</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <span
                          className={`capitalize px-2 py-0.5 rounded-full text-xs ${
                            campaign.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : campaign.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t pt-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(campaign.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="gap-1"
                      >
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
