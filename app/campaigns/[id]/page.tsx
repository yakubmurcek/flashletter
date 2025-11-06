import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'

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

  if (campaign.user_id !== user.id) {
    notFound()
  }

  redirect(`/create/editor?campaign=${id}`)
}
