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
import { useCampaign } from '@/lib/campaign-context'
import { useUrlState } from '@/lib/hooks/use-url-state'
import {
  getSubjectForDay,
  getPreviewForDay,
  getContentForDay,
} from '@/lib/utils/email-helpers'
import type { Email, SelectedContext } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { CampaignStorageService } from '@/lib/services/campaign-storage.service'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'

function EditorPageContent() {
  const router = useRouter()
  const {
    landingPageData,
    config,
    generatedEmails: initialEmails,
    isLoading,
    currentCampaignId,
    loadCampaign,
  } = useCampaign()
  const {
    getParam,
    setParam,
    toggleParam,
    getCampaignId,
    getEmailId,
    getEmailIdWithFallback,
    setMultipleParams,
    cleanupParams,
    isValidCampaignId,
    isValidEmailId,
  } = useUrlState()
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedContext, setSelectedContext] =
    useState<SelectedContext | null>(null)
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(
    null
  )
  const [versionCounts, setVersionCounts] = useState<Record<number, number>>({})
  const [campaignLoaded, setCampaignLoaded] = useState(false)

  // Initialize version storage service
  const supabase = createClient()
  const versionStorageService = new EmailVersionStorageService(supabase)

  // Use validated getters
  const campaignIdFromUrl = getCampaignId()
  const emailIdFromUrl = getEmailId()
  const selectedEmailId = getEmailIdWithFallback(1)
  const showChat = getParam('chat') === 'open'
  const restoreParam = getParam('restore')

  // Load campaign from database if campaignId is in URL
  useEffect(() => {
    if (campaignIdFromUrl && !campaignLoaded && !isLoading) {
      loadCampaign(campaignIdFromUrl)
        .then(() => setCampaignLoaded(true))
        .catch((error) => {
          console.error('Failed to load campaign:', error)
          // Clean up all params when redirecting due to invalid campaign
          cleanupParams([])
          router.push('/campaigns')
        })
    }
  }, [
    campaignIdFromUrl,
    campaignLoaded,
    isLoading,
    loadCampaign,
    router,
    cleanupParams,
  ])

  useEffect(() => {
    // Don't redirect while still loading from storage or loading a campaign
    if (isLoading) return

    // If we're loading a campaign from URL, wait for it to complete
    if (campaignIdFromUrl && !campaignLoaded) return

    // Only redirect if we have no essential data AND we're not in the middle of loading a campaign
    // This prevents redirecting when we have a valid campaign ID in the URL but data hasn't loaded yet
    if ((!landingPageData || !config) && !campaignIdFromUrl) {
      router.push('/create')
      return
    }

    // Set up emails only if we have config data
    if (config && initialEmails.length > 0) {
      setEmails(initialEmails)
    }
  }, [
    landingPageData,
    config,
    initialEmails,
    router,
    isLoading,
    campaignIdFromUrl,
    campaignLoaded,
  ])

  // Ensure default email is always present when emails are loaded
  useEffect(() => {
    if (emails.length > 0) {
      // Only set default email if there's no valid email ID in URL
      if (!emailIdFromUrl) {
        const defaultEmailId = 1
        const params: Record<string, string> = {
          email: defaultEmailId.toString(),
        }
        if (campaignIdFromUrl) {
          params.campaign = campaignIdFromUrl
        }
        setMultipleParams(params)
      }
    }
  }, [emails.length, emailIdFromUrl, campaignIdFromUrl, setMultipleParams])

  // Clear context when switching emails
  useEffect(() => {
    setSelectedContext(null)
    setAutoSubmitMessage(null)
  }, [selectedEmailId])

  // Load version counts for all emails
  useEffect(() => {
    if (emails.length > 0) {
      const loadVersionCounts = async () => {
        const counts: Record<number, number> = {}
        for (const email of emails) {
          if (email.uuid) {
            try {
              const count = await versionStorageService.getVersionCount(
                email.uuid
              )
              counts[email.id] = count
            } catch (error) {
              console.error(
                `Failed to load version count for email ${email.id}:`,
                error
              )
              counts[email.id] = 0
            }
          } else {
            counts[email.id] = 0
          }
        }
        setVersionCounts(counts)
      }
      loadVersionCounts()
    }
  }, [emails])

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
            setEmails((prev) =>
              prev.map((email) =>
                email.id === restoreData.emailId
                  ? {
                      ...email,
                      subject: restoreData.subject,
                      content: restoreData.content,
                    }
                  : email
              )
            )

            // Update version count for this email
            const restoredEmail = emails.find(
              (e) => e.id === restoreData.emailId
            )
            if (restoredEmail?.uuid) {
              try {
                const count = await versionStorageService.getVersionCount(
                  restoredEmail.uuid
                )
                setVersionCounts((prev) => ({
                  ...prev,
                  [restoreData.emailId]: count,
                }))
              } catch (error) {
                console.error(
                  'Failed to load version count after restore:',
                  error
                )
              }
            }

            // Clear the restore param from URL, preserve campaign ID atomically
            const params: Record<string, string> = {
              email: restoreData.emailId.toString(),
            }
            if (campaignIdFromUrl) {
              params.campaign = campaignIdFromUrl
            }
            setMultipleParams(params)
          } else {
            console.error('Invalid restore data:', restoreData)
          }
        } catch (error) {
          console.error('Failed to restore version:', error)
        }
      }
      handleRestore()
    }
  }, [restoreParam, router, campaignIdFromUrl, setMultipleParams])

  // Show loading state while loading or when we have a campaign ID but haven't loaded the campaign yet
  if (isLoading || (campaignIdFromUrl && !campaignLoaded)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    )
  }

  // Only redirect to create page if we have no data and no campaign ID to load
  if (!landingPageData || !config) {
    return null
  }

  const selectedEmail = emails.find((e) => e.id === selectedEmailId)

  const handleSelectEmail = (id: number) => {
    // Basic validation before setting
    if (!isValidEmailId(id.toString())) {
      console.warn(`Invalid email ID: ${id}`)
      return
    }

    // Set email ID and preserve campaign ID
    const params: Record<string, string> = { email: id.toString() }
    if (campaignIdFromUrl) {
      params.campaign = campaignIdFromUrl
    }

    setMultipleParams(params)
  }

  const handleUpdateEmail = async (
    id: number,
    updates: Partial<Email>,
    skipVersioning = false
  ) => {
    // Save current version before updating (unless explicitly skipped)
    if (!skipVersioning) {
      const currentEmail = emails.find((e) => e.id === id)
      if (currentEmail && currentEmail.uuid) {
        console.log('[HANDLE UPDATE] Before save:', {
          emailId: id,
          emailUuid: currentEmail.uuid,
          currentSubject: currentEmail.subject.substring(0, 50),
          currentContentPreview: currentEmail.content.substring(0, 100),
          newSubject: updates.subject?.substring(0, 50),
          newContentPreview: updates.content?.substring(0, 100),
        })
        try {
          await versionStorageService.saveVersion(
            currentEmail.uuid,
            currentEmail.day,
            {
              subject: currentEmail.subject,
              content: currentEmail.content,
            }
          )
        } catch (error) {
          console.error('Failed to save version:', error)
          // Continue with update even if versioning fails
        }
      } else {
        console.error('[HANDLE UPDATE] Email not found or missing UUID:', id)
      }
    } else {
      console.log('[HANDLE UPDATE] Skipping versioning (restore flow)')
    }

    // Update the email
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, ...updates } : email))
    )

    // Save to Supabase if we have a campaign ID
    if (currentCampaignId) {
      const supabase = createClient()
      const campaignService = new CampaignStorageService(supabase)

      // Debounce the save operation
      setTimeout(() => {
        campaignService
          .updateEmail(currentCampaignId, id, updates)
          .catch((error) =>
            console.error('Failed to save email to database:', error)
          )
      }, 1000)
    }
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
                {landingPageData.url}
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
              {emails.length} emails • {config.campaignType}
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
                      campaignType: config.campaignType,
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
