'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, Download, Send } from 'lucide-react'
import { EmailList } from '@/components/email-list'
import { EmailPreview } from '@/components/email-preview'
import { AIChatAssistant } from '@/components/ai-chat-assistant'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useCampaign } from '@/lib/campaign-context'
import type { Email } from '@/lib/types'

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    landingPageData,
    config,
    generatedEmails: initialEmails,
  } = useCampaign()
  const [showChat, setShowChat] = useState(false)
  const [emails, setEmails] = useState<Email[]>([])

  const emailIdFromUrl = searchParams.get('email')
  const selectedEmailId = emailIdFromUrl ? parseInt(emailIdFromUrl, 10) : 1

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
    const chatParam = searchParams.get('chat')
    setShowChat(chatParam === 'open')
  }, [searchParams])

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
    const params = new URLSearchParams(searchParams.toString())
    params.set('email', id.toString())
    router.push(`/create/editor?${params.toString()}`)
  }

  const handleUpdateEmail = (id: number, updates: Partial<Email>) => {
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, ...updates } : email))
    )
  }

  const handleToggleChat = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (showChat) {
      params.delete('chat')
    } else {
      params.set('chat', 'open')
    }
    const emailParam = params.get('email')
    const url = emailParam
      ? `/create/editor?${params.toString()}`
      : params.has('chat')
      ? `/create/editor?chat=open`
      : '/create/editor'
    router.replace(url)
    setShowChat(!showChat)
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
              onClick={handleToggleChat}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
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
              onClose={() => setShowChat(false)}
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

function getSubjectForDay(day: number, type: string): string {
  const subjects: Record<string, string[]> = {
    nurture: [
      'Welcome to our community',
      "Here's what you need to know",
      'Success stories from our users',
      'Tips to get the most value',
      'Your progress so far',
      'Advanced features unlocked',
      'Join our upcoming webinar',
    ],
    onboarding: [
      'Welcome aboard!',
      'Getting started guide',
      'Your first steps',
      'Pro tips for success',
      'Meet your dashboard',
      'Advanced features',
      "You're all set!",
    ],
    promotional: [
      'Special offer inside',
      'Limited time discount',
      'Exclusive deal for you',
      'Last chance to save',
      'New features released',
      'Premium upgrade available',
      'Final reminder',
    ],
  }

  const typeSubjects = subjects[type] || subjects.nurture
  return typeSubjects[Math.min(day - 1, typeSubjects.length - 1)]
}

function getPreviewForDay(day: number, type: string): string {
  return `This is email ${day} of your ${type} campaign. Click to edit and customize the content.`
}

function getContentForDay(day: number, type: string, tone: string): string {
  return `# Welcome to Day ${day}

Hi there,

This is **Day ${day}** of your ${type} campaign with a ${tone} tone.

## What's Inside

Your personalized content will appear here based on your landing page analysis. This email is designed to engage your audience and drive action.

### Key Points

• Engaging introduction that captures attention
• Clear value proposition that resonates
• Compelling call-to-action that converts
• Social proof and testimonials for credibility

## Next Steps

We're excited to help you achieve your goals. Click the button below to get started.

Best regards,  
**Your Team**`
}
