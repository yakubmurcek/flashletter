'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, Download, Send } from 'lucide-react'
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
import type { Email } from '@/lib/types'

export default function EditorPage() {
  const router = useRouter()
  const {
    landingPageData,
    config,
    generatedEmails: initialEmails,
  } = useCampaign()
  const { getParam, setParam, toggleParam } = useUrlState()
  const [emails, setEmails] = useState<Email[]>([])

  const emailIdFromUrl = getParam('email')
  const selectedEmailId = emailIdFromUrl ? parseInt(emailIdFromUrl, 10) : 1
  const showChat = getParam('chat') === 'open'

  useEffect(() => {
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
  }, [landingPageData, config, initialEmails, router])

  useEffect(() => {
    if (emails.length > 0 && !emailIdFromUrl) {
      router.replace('/create/editor?email=1')
    }
  }, [emails.length, emailIdFromUrl, router])

  if (!landingPageData || !config) {
    return null
  }

  const selectedEmail = emails.find((e) => e.id === selectedEmailId)

  const handleSelectEmail = (id: number) => {
    setParam('email', id.toString())
  }

  const handleUpdateEmail = (id: number, updates: Partial<Email>) => {
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, ...updates } : email))
    )
  }

  const handleToggleChat = () => {
    toggleParam('chat', 'open')
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
