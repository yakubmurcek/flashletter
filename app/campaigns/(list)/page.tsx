import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Plus, Save } from 'lucide-react'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { AppShell } from '@/components/layouts/app-shell'

import { CampaignCard } from '@/components/campaign/campaign-card'

export const metadata = {
  title: 'Campaigns',
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
      headerRight={
        // Signing a guest out would throw their campaigns away; offer to save them instead.
        user.is_anonymous ? (
          <Button
            asChild
            size="sm"
            className="gap-2"
          >
            <Link href="/signup">
              <Save className="h-4 w-4" />
              Sign up to save
            </Link>
          </Button>
        ) : (
          <>
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link href="/account">Account</Link>
            </Button>
            <SignOutButton />
          </>
        )
      }
      withFooter={false}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-display text-3xl md:text-5xl mb-3">Campaigns</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Every sequence you have generated. Open one to keep editing.
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
            New campaign
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
              Paste a landing page URL and get a five-email sequence in about a minute.
            </p>
            <Button asChild>
              <Link
                href="/create"
                prefetch
              >
                Generate your first sequence
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
