import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import { EmailList } from '@/components/email-list'
import { notFound } from 'next/navigation'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const campaignService = new CampaignStorageService(supabase)
  const campaign = await campaignService.getCampaign(id)

  if (!campaign) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/campaigns" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Campaigns
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/create/editor?campaign=${id}`} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Campaign
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {campaign.name || 'Untitled Campaign'}
            </h1>
            {campaign.landing_page_url && (
              <a
                href={campaign.landing_page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {campaign.landing_page_url}
              </a>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Campaign Type
              </div>
              <div className="text-2xl font-semibold capitalize">
                {campaign.campaign_type || 'N/A'}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">Tone</div>
              <div className="text-2xl font-semibold capitalize">
                {campaign.tone || 'N/A'}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-sm text-muted-foreground mb-1">Duration</div>
              <div className="text-2xl font-semibold">
                {campaign.days ? `${campaign.days} days` : 'N/A'}
              </div>
            </div>
          </div>

          {campaign.emails && campaign.emails.length > 0 ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Email Sequence</h2>
              <div className="space-y-4">
                {campaign.emails.map((email) => (
                  <div
                    key={email.id}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground mb-1">
                          Day {email.day}
                        </div>
                        <div className="font-semibold mb-1">
                          {email.subject}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {email.preview}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No emails generated yet for this campaign
              </p>
              <Button asChild>
                <Link href={`/create/configure?campaign=${id}`}>
                  Configure & Generate Emails
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
