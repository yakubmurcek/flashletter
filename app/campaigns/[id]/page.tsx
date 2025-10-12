import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
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

  // Verify campaign exists before redirecting
  const campaignService = new CampaignStorageService(supabase)
  const campaign = await campaignService.getCampaign(id)

  if (!campaign) {
    notFound()
  }

  // Redirect directly to the editor
  redirect(`/create/editor?campaign=${id}`)
}
