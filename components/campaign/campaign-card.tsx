'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Calendar, ArrowRight, Trash2, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Campaign {
  id: string
  name: string | null
  landing_page_url: string | null
  campaign_type: string | null
  days: number | null
  status: 'draft' | 'active' | 'completed'
  updated_at: string
}

interface CampaignCardProps {
  campaign: Campaign
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete campaign')
      }

      // Refresh the page to show updated list
      router.refresh()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Failed to delete campaign. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card className="flex flex-col">
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
                <span className="capitalize">{campaign.campaign_type}</span>
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/campaigns/${campaign.id}`} className="gap-1">
                View
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          onInteractOutside={(e: React.SyntheticEvent | Event) => {
            if (isDeleting) e.preventDefault()
          }}
          onEscapeKeyDown={(e: React.KeyboardEvent | KeyboardEvent) => {
            if (isDeleting) e.preventDefault()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              campaign &quot;{campaign.name || 'Untitled Campaign'}&quot; and
              all associated emails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Campaign'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
