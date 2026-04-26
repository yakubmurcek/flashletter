import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Plus } from 'lucide-react'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { AppShell } from '@/components/layouts/app-shell'

import { CampaignCard } from '@/components/campaign/campaign-card'

export const metadata = {
  title: 'My Campaigns - Flashletter',
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
    <AppShell
      headerRight={<SignOutButton />}
      withFooter={false}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-display text-3xl md:text-5xl mb-3">My Campaigns</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Manage and view all your email campaigns
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="gap-2 w-full md:w-auto"
        >
          <Link
            href="/create"
            prefetch
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-display text-2xl md:text-3xl mb-3">No campaigns yet</h3>
            <p className="text-muted-foreground mb-8">
              Get started by creating your first email campaign
            </p>
            <Button asChild>
              <Link
                href="/create"
                prefetch
              >
                Create Your First Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
