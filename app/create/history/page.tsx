'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useCampaign } from '@/lib/campaign-context'
import { VersionList } from '@/components/version-list'
import { DiffViewer } from '@/components/diff-viewer'
import { VersionPreview } from '@/components/version-preview'
import type { EmailVersion } from '@/lib/types'
import { isValidCampaignId, isValidEmailId } from '@/lib/utils/validation'
import { createClient } from '@/lib/supabase/client'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'

function HistoryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { generatedEmails, isLoading } = useCampaign()

  const emailIdParam = searchParams.get('emailId')
  const emailId = emailIdParam ? parseInt(emailIdParam, 10) : null
  const campaignId = searchParams.get('campaign')

  const validCampaignId = campaignId && isValidCampaignId(campaignId) ? campaignId : null
  const validEmailId = emailId && isValidEmailId(emailId) ? emailId : null

  const [versions, setVersions] = useState<EmailVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<EmailVersion | null>(null)

  // Initialize version storage service
  const supabase = createClient()
  const versionStorageService = useMemo(() => new EmailVersionStorageService(supabase), [supabase])

  // Load versions when email ID changes
  useEffect(() => {
    if (validEmailId) {
      const loadVersions = async () => {
        const currentEmail = generatedEmails.find((e) => e.id === validEmailId)
        if (currentEmail?.uuid) {
          try {
            const loadedVersions = await versionStorageService.getVersions(currentEmail.uuid)
            console.log('[HISTORY PAGE] Loaded versions:', {
              emailId: validEmailId,
              emailUuid: currentEmail.uuid,
              count: loadedVersions.length,
              versions: loadedVersions.map((v) => ({
                id: v.id,
                subject: v.subject.substring(0, 30),
                contentPreview: v.content.substring(0, 50),
              })),
            })
            setVersions(loadedVersions)

            // Auto-select the latest version
            if (loadedVersions.length > 0 && !selectedVersionId) {
              setSelectedVersionId(loadedVersions[loadedVersions.length - 1].id)
            }
          } catch (error) {
            console.error('Failed to load versions:', error)
            setVersions([])
          }
        } else {
          console.error('Email not found or missing UUID:', validEmailId)
          setVersions([])
        }
      }
      loadVersions()
    }
  }, [validEmailId, generatedEmails, selectedVersionId, versionStorageService])

  // Route guard
  useEffect(() => {
    if (!isLoading && !validEmailId) {
      const editorUrl = validCampaignId
        ? `/create/editor?campaign=${validCampaignId}`
        : '/create/editor'
      router.push(editorUrl)
    }
  }, [isLoading, validEmailId, validCampaignId, router])

  if (isLoading) {
    return null
  }

  if (!validEmailId) {
    return null
  }

  const currentEmail = generatedEmails.find((e) => e.id === validEmailId)

  if (!currentEmail) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Email Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The email you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link
              href={
                validCampaignId
                  ? `/create/editor?email=${validEmailId}&campaign=${validCampaignId}`
                  : `/create/editor?email=${validEmailId}`
              }
            >
              Back to Editor
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const selectedVersion = selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId)
    : null

  const selectedIndex = selectedVersion ? versions.findIndex((v) => v.id === selectedVersionId) : -1

  const previousVersion = selectedIndex > 0 ? versions[selectedIndex - 1] : null

  const handleRestoreVersion = (version: EmailVersion) => {
    setVersionToRestore(version)
    setShowRestoreConfirm(true)
  }

  const confirmRestore = async () => {
    if (!versionToRestore) return

    // Save current state as a version before restoring
    if (currentEmail.uuid) {
      try {
        await versionStorageService.saveVersion(currentEmail.uuid, currentEmail.day, {
          subject: currentEmail.subject,
          content: currentEmail.content,
        })
      } catch (error) {
        console.error('Failed to save current version before restore:', error)
      }
    }

    // Navigate back to editor with only the version's UUID — the editor will
    // fetch the actual subject/content from Supabase, which RLS-checks the
    // chain back to the user. Previously the URL carried JSON with arbitrary
    // subject/content, which an attacker could craft to overwrite an email
    // via a shared link.
    const restoreVersionId = encodeURIComponent(versionToRestore.id)
    const editorUrl = campaignId
      ? `/create/editor?email=${emailId}&campaign=${campaignId}&restoreVersion=${restoreVersionId}`
      : `/create/editor?email=${emailId}&restoreVersion=${restoreVersionId}`
    router.push(editorUrl)
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2"
            >
              <Link
                href={
                  validCampaignId
                    ? `/create/editor?email=${emailId}&campaign=${validCampaignId}`
                    : `/create/editor?email=${emailId}`
                }
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Editor
              </Link>
            </Button>
            <div>
              <div className="text-sm font-medium">Version History</div>
              <div className="text-xs text-muted-foreground">
                Day {currentEmail.day} - {currentEmail.subject}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden h-0">
        {/* Left: Version List */}
        <aside className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
          <VersionList
            versions={versions}
            selectedVersionId={selectedVersionId}
            onSelectVersion={setSelectedVersionId}
            onRestoreVersion={handleRestoreVersion}
          />
        </aside>

        {/* Center: Diff Viewer */}
        <main className="flex-1 overflow-hidden">
          {selectedVersion ? (
            <DiffViewer
              oldVersion={previousVersion}
              newVersion={selectedVersion}
              viewMode="unified"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a version to view changes</p>
            </div>
          )}
        </main>

        {/* Right: Version Preview */}
        <aside className="w-96 border-l border-border bg-card overflow-hidden">
          {selectedVersion ? (
            <VersionPreview
              version={selectedVersion}
              onRestore={handleRestoreVersion}
              isLatest={selectedIndex === versions.length - 1}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-8 text-center">
              <p className="text-muted-foreground">Select a version to preview</p>
            </div>
          )}
        </aside>
      </div>

      <AlertDialog
        open={showRestoreConfirm && !!versionToRestore}
        onOpenChange={(open) => {
          if (!open) {
            setShowRestoreConfirm(false)
            setVersionToRestore(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the email to this previous version. Your current version will be
              saved in the history, so you can always get it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmRestore()
                setShowRestoreConfirm(false)
              }}
            >
              Restore version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}
    >
      <HistoryPageContent />
    </Suspense>
  )
}
