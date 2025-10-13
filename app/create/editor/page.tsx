'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Download,
  Send,
  History,
} from 'lucide-react'
import { EmailList } from '@/components/email-list'
import { EmailPreview } from '@/components/email-preview'
import { AIChatAssistant } from '@/components/ai-chat-assistant'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useCampaignData, useCampaignActions } from '@/lib/campaign-context'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCampaignLoader } from '@/lib/hooks/use-campaign-loader'
import { useEmailState } from '@/lib/hooks/use-email-state'
import { useVersionTracking } from '@/lib/hooks/use-version-tracking'
import { useEmailAutosave } from '@/lib/hooks/use-email-autosave'
import {
  getSubjectForDay,
  getPreviewForDay,
  getContentForDay,
} from '@/lib/utils/email-helpers'
import type { Email, SelectedContext } from '@/lib/types'

function EditorPageContent() {
  const router = useRouter()

  // Use new focused hooks
  const { loadingState, campaignData, error } = useCampaignLoader()
  const { emails, selectedEmail, selectedEmailId, selectEmail, updateEmail } =
    useEmailState()
  const { versionCounts, restoreVersion } = useVersionTracking(emails)
  const { currentCampaignId } = useCampaignData()
  const { saveEmail } = useEmailAutosave(emails, currentCampaignId, updateEmail)

  const { getParam, setParam, toggleParam, getCampaignId } = useUrlState()

  const [selectedContext, setSelectedContext] =
    useState<SelectedContext | null>(null)
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(
    null
  )

  // Use validated getters
  const campaignIdFromUrl = getCampaignId()
  const showChat = getParam('chat') === 'open'
  const restoreParam = getParam('restore')

  // Extract data from campaign data
  const landingPageData = campaignData?.landingPageData
  const config = campaignData?.config

  // Handle restoration from history page
  useEffect(() => {
    if (restoreParam) {
      const handleRestore = async () => {
        try {
          const restoreData = JSON.parse(decodeURIComponent(restoreParam))

          // Validate restore data
          if (
            restoreData &&
            typeof restoreData.emailId === 'number' &&
            typeof restoreData.subject === 'string' &&
            typeof restoreData.content === 'string'
          ) {
            // Update the email directly (versioning already handled by history page)
            updateEmail(restoreData.emailId, {
              subject: restoreData.subject,
              content: restoreData.content,
            })

            // Update version count for this email
            await restoreVersion(restoreData)
          } else {
            console.error('Invalid restore data:', restoreData)
          }
        } catch (error) {
          console.error('Failed to restore version:', error)
        }
      }
      handleRestore()
    }
  }, [restoreParam, updateEmail, restoreVersion])

  // Show loading state
  if (loadingState === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (loadingState === 'error') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4">Error Loading Campaign</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'Failed to load campaign data'}
          </p>
          <Button asChild className="mt-4">
            <Link href="/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show error state if no campaign ID is provided
  if (!campaignIdFromUrl) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4">No Campaign Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a campaign to edit from the campaigns page.
          </p>
          <Button asChild className="mt-4">
            <Link href="/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show error state if we have no essential data after loading is complete
  if (loadingState === 'loaded' && !config && emails.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4">Campaign Data Missing</h2>
          <p className="text-muted-foreground mb-4">
            This campaign appears to be incomplete. It's missing both
            configuration and email data.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Landing Page Data: {landingPageData ? '✓' : '✗'}</p>
            <p>Campaign Config: {config ? '✓' : '✗'}</p>
            <p>Emails: {emails.length}</p>
            <p>Campaign ID: {campaignIdFromUrl || 'None'}</p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleSelectEmail = (id: number) => {
    selectEmail(id)
  }

  const handleUpdateEmail = async (
    id: number,
    updates: Partial<Email>,
    skipVersioning = false
  ) => {
    await saveEmail(id, updates, skipVersioning)
  }

  const handleToggleChat = () => {
    toggleParam('chat', 'open')
  }

  const handleTextSelected = (text: string, action: string) => {
    setSelectedContext({ text, action })
    // Auto-open chat when text is selected
    if (!showChat) {
      setParam('chat', 'open')
    }

    // For command actions (not "Ask AI about this"), auto-submit the action
    const isCommandAction = action !== 'Ask AI about this'
    if (isCommandAction) {
      setAutoSubmitMessage(action)
    }
  }

  const handleClearContext = () => {
    setSelectedContext(null)
  }

  const handleAutoSubmitComplete = () => {
    setAutoSubmitMessage(null)
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/campaigns">
                <ArrowLeft className="w-4 h-4" />
                Back to Campaigns
              </Link>
            </Button>
            <div className="hidden md:block">
              <div className="text-sm font-medium">Email Campaign Editor</div>
              <div className="text-xs text-muted-foreground truncate max-w-md">
                {landingPageData?.url || 'No URL available'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent relative"
              asChild
            >
              <Link
                href={
                  campaignIdFromUrl
                    ? `/create/history?emailId=${selectedEmailId}&campaign=${campaignIdFromUrl}`
                    : `/create/history?emailId=${selectedEmailId}`
                }
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
                {versionCounts[selectedEmailId] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {versionCounts[selectedEmailId]}
                  </span>
                )}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Deploy</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-0">
        <aside className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Campaign Emails</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {emails.length} emails • {config?.campaignType || 'Unknown'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <EmailList
              emails={emails}
              selectedId={selectedEmailId}
              onSelect={handleSelectEmail}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {selectedEmail && (
            <EmailPreview
              email={selectedEmail}
              onUpdate={(updates) =>
                handleUpdateEmail(selectedEmail.id, updates)
              }
              onTextSelected={handleTextSelected}
            />
          )}
        </main>

        <aside
          className={cn(
            'border-l border-border bg-card transition-all duration-300 shadow-lg flex-shrink-0',
            showChat ? 'w-96' : 'w-0 overflow-hidden'
          )}
        >
          {showChat && (
            <AIChatAssistant
              onClose={handleToggleChat}
              campaignContext={
                landingPageData && config && selectedEmail
                  ? {
                      landingPageData,
                      config,
                      allEmails: emails,
                      currentEmailId: selectedEmail.id,
                    }
                  : undefined
              }
              emailContext={
                selectedEmail
                  ? {
                      subject: selectedEmail.subject,
                      content: selectedEmail.content,
                      campaignType: config?.campaignType || 'Unknown',
                    }
                  : undefined
              }
              onApplyEdits={(edits) => {
                if (selectedEmail) {
                  handleUpdateEmail(selectedEmail.id, edits)
                }
              }}
              selectedContext={selectedContext}
              onClearContext={handleClearContext}
              autoSubmitMessage={autoSubmitMessage}
              onAutoSubmitComplete={handleAutoSubmitComplete}
            />
          )}
        </aside>
      </div>

      {!showChat && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-2xl hover:scale-110 transition-transform animate-pulse"
          onClick={handleToggleChat}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  )
}
