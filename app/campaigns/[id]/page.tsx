import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { FEATURE_FLAGS } from '@/lib/constants/app'

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string }
}) {
  if (!FEATURE_FLAGS.SHOW_FULL_PRODUCT) {
    redirect('/#waitlist')
  }

  const { id } = params
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
