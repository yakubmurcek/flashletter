'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useCampaign } from '@/lib/campaign-context'
import { versionStorage } from '@/lib/utils/version-storage'
import { VersionList } from '@/components/version-list'
import { DiffViewer } from '@/components/diff-viewer'
import { VersionPreview } from '@/components/version-preview'
import type { EmailVersion } from '@/lib/types'
import { isValidCampaignId, isValidEmailId } from '@/lib/utils/validation'

function HistoryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { generatedEmails, isLoading } = useCampaign()

  const emailIdParam = searchParams.get('emailId')
  const emailId = emailIdParam ? parseInt(emailIdParam, 10) : null
  const campaignId = searchParams.get('campaign')

  const validCampaignId =
    campaignId && isValidCampaignId(campaignId) ? campaignId : null
  const validEmailId = emailId && isValidEmailId(emailId) ? emailId : null

  const [versions, setVersions] = useState<EmailVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [versionToRestore, setVersionToRestore] = useState<EmailVersion | null>(
    null
  )

  // Load versions when email ID changes
  useEffect(() => {
    if (validEmailId) {
      const loadedVersions = versionStorage.getVersions(validEmailId)
      console.log('[HISTORY PAGE] Loaded versions:', {
        emailId: validEmailId,
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
    }
  }, [validEmailId])

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
            The email you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link href="/create/editor">Back to Editor</Link>
          </Button>
        </div>
      </div>
    )
  }

  const selectedVersion = selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId)
    : null

  const selectedIndex = selectedVersion
    ? versions.findIndex((v) => v.id === selectedVersionId)
    : -1

  const previousVersion = selectedIndex > 0 ? versions[selectedIndex - 1] : null

  const handleRestoreVersion = (version: EmailVersion) => {
    setVersionToRestore(version)
    setShowRestoreConfirm(true)
  }

  const confirmRestore = () => {
    if (!versionToRestore) return

    // Save the restored version as a new version (non-destructive)
    const restoredEmail = {
      ...currentEmail,
      subject: versionToRestore.subject,
      content: versionToRestore.content,
    }

    // Save current state as a version before restoring
    versionStorage.saveVersion(validEmailId, currentEmail)

    // Navigate back to editor with the restored content
    // We'll pass the restore data via URL params
    const restoreData = encodeURIComponent(
      JSON.stringify({
        emailId: validEmailId,
        subject: versionToRestore.subject,
        content: versionToRestore.content,
      })
    )

    const editorUrl = campaignId
      ? `/create/editor?email=${emailId}&campaign=${campaignId}&restore=${restoreData}`
      : `/create/editor?email=${emailId}&restore=${restoreData}`
    router.push(editorUrl)
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href={`/create/editor?email=${emailId}`}>
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
            currentEmailId={validEmailId}
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
              <p className="text-muted-foreground">
                Select a version to view changes
              </p>
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
              <p className="text-muted-foreground">
                Select a version to preview
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && versionToRestore && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowRestoreConfirm(false)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              Restore This Version?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will restore the email to this previous version. Your current
              version will be saved in the history, so you can always get it
              back.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRestoreConfirm(false)
                  setVersionToRestore(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  confirmRestore()
                  setShowRestoreConfirm(false)
                }}
              >
                Restore Version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  )
}
