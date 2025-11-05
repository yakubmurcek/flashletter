import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated background elements - matching landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <header className="border-b border-border backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/icon-192.webp"
              alt="Flashletter"
              width={32}
              height={32}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-xl font-semibold group-hover:text-primary transition-colors">
              Flashletter
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-3">My Campaigns</h1>
              <p className="text-muted-foreground text-lg">
                Manage and view all your email campaigns
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="gap-2 bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-all duration-300 w-full md:w-auto"
            >
              <Link href="/create" prefetch>
                <Plus className="w-5 h-5" />
                New Campaign
              </Link>
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card className="text-center py-16 border-border/60">
              <CardContent>
                <div className="flex items-center justify-center mx-auto mb-6">
                  <Image
                    src="/icon-192.webp"
                    alt="Flashletter"
                    width={80}
                    height={80}
                    priority
                  />
                </div>
                <h3 className="text-2xl font-bold mb-3">No campaigns yet</h3>
                <p className="text-muted-foreground mb-8 text-lg">
                  Get started by creating your first email campaign
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-all duration-300"
                >
                  <Link href="/create" prefetch>
                    Create Your First Campaign
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
