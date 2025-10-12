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
import { versionStorage } from '@/lib/utils/version-storage'
import type { Email, SelectedContext } from '@/lib/types'

function EditorPageContent() {
  const router = useRouter()
  const {
    landingPageData,
    config,
    generatedEmails: initialEmails,
    isLoading,
  } = useCampaign()
  const { getParam, setParam, toggleParam } = useUrlState()
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedContext, setSelectedContext] =
    useState<SelectedContext | null>(null)
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(
    null
  )
  const [versionCounts, setVersionCounts] = useState<Record<number, number>>({})

  const emailIdFromUrl = getParam('email')
  const selectedEmailId = emailIdFromUrl ? parseInt(emailIdFromUrl, 10) : 1
  const showChat = getParam('chat') === 'open'
  const restoreParam = getParam('restore')

  useEffect(() => {
    // Don't redirect while still loading from storage
    if (isLoading) return

    if (!landingPageData || !config) {
      router.push('/create')
      return
    }

    if (initialEmails.length > 0) {
      setEmails(initialEmails)
    } else {
      const fallbackEmails = Array.from({ length: config.days }, (_, i) => ({
        id: i + 1,
        day: i + 1,
        subject: `Day ${i + 1}: ${getSubjectForDay(
          i + 1,
          config.campaignType
        )}`,
        preview: getPreviewForDay(i + 1, config.campaignType),
        content: getContentForDay(i + 1, config.campaignType, config.tone),
      }))
      setEmails(fallbackEmails)
    }
  }, [landingPageData, config, initialEmails, router, isLoading])

  useEffect(() => {
    if (emails.length > 0 && !emailIdFromUrl) {
      router.replace('/create/editor?email=1')
    }
  }, [emails.length, emailIdFromUrl, router])

  // Clear context when switching emails
  useEffect(() => {
    setSelectedContext(null)
    setAutoSubmitMessage(null)
  }, [selectedEmailId])

  // Load version counts for all emails
  useEffect(() => {
    if (emails.length > 0) {
      const counts: Record<number, number> = {}
      emails.forEach((email) => {
        counts[email.id] = versionStorage.getVersionCount(email.id)
      })
      setVersionCounts(counts)
    }
  }, [emails])

  // Handle restoration from history page
  useEffect(() => {
    if (restoreParam) {
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
          setVersionCounts((prev) => ({
            ...prev,
            [restoreData.emailId]: versionStorage.getVersionCount(
              restoreData.emailId
            ),
          }))

          // Clear the restore param from URL
          router.replace(`/create/editor?email=${restoreData.emailId}`)
        } else {
          console.error('Invalid restore data:', restoreData)
        }
      } catch (error) {
        console.error('Failed to restore version:', error)
      }
    }
  }, [restoreParam, router])

  if (isLoading || !landingPageData || !config) {
    return null
  }

  const selectedEmail = emails.find((e) => e.id === selectedEmailId)

  const handleSelectEmail = (id: number) => {
    setParam('email', id.toString())
  }

  const handleUpdateEmail = (
    id: number,
    updates: Partial<Email>,
    skipVersioning = false
  ) => {
    // Save current version before updating (unless explicitly skipped)
    if (!skipVersioning) {
      const currentEmail = emails.find((e) => e.id === id)
      if (currentEmail) {
        console.log('[HANDLE UPDATE] Before save:', {
          emailId: id,
          currentSubject: currentEmail.subject.substring(0, 50),
          currentContentPreview: currentEmail.content.substring(0, 100),
          newSubject: updates.subject?.substring(0, 50),
          newContentPreview: updates.content?.substring(0, 100),
        })
        try {
          versionStorage.saveVersion(id, currentEmail)
        } catch (error) {
          console.error('Failed to save version:', error)
          // Continue with update even if versioning fails
        }
      } else {
        console.error('[HANDLE UPDATE] Email not found:', id)
      }
    } else {
      console.log('[HANDLE UPDATE] Skipping versioning (restore flow)')
    }

    // Update the email
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, ...updates } : email))
    )
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
              <Link href="/create/configure">
                <ArrowLeft className="w-4 h-4" />
                Back
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
              <Link href={`/create/history?emailId=${selectedEmailId}`}>
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
