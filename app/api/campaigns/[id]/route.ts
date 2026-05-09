import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: campaignId } = await params

    // Verify the campaign belongs to the user
    const campaignService = new CampaignStorageService(supabase)
    const campaign = await campaignService.getCampaign(campaignId)

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the campaign
    await campaignService.deleteCampaign(campaignId)

    return NextResponse.json({ success: true })
  } catch (error) {
    // Report to Sentry
    Sentry.captureException(error, {
      tags: { api_route: '/api/campaigns/[id]', action: 'delete' },
    })

    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
