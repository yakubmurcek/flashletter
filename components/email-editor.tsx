'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MessageSquare, Download, Send } from 'lucide-react'
import { EmailList } from './email-list'
import { EmailPreview } from './email-preview'
import { AIChatAssistant } from './ai-chat-assistant'
import { cn } from '@/lib/utils'
import type { Email, CampaignConfig } from '@/lib/types'

interface EmailEditorProps {
  landingUrl: string
  config: CampaignConfig
  initialEmails: Email[]
  onBack: () => void
}

export function EmailEditor({
  landingUrl,
  config,
  initialEmails,
  onBack,
}: EmailEditorProps) {
  const [showChat, setShowChat] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState(1)

  const [emails, setEmails] = useState<Email[]>(
    initialEmails.length > 0
      ? initialEmails
      : Array.from({ length: config.days }, (_, i) => ({
          id: i + 1,
          day: i + 1,
          subject: `Day ${i + 1}: ${getSubjectForDay(
            i + 1,
            config.campaignType
          )}`,
          preview: getPreviewForDay(i + 1, config.campaignType),
          content: getContentForDay(i + 1, config.campaignType, config.tone),
        }))
  )

  const selectedEmail = emails.find((e) => e.id === selectedEmailId)

  const handleUpdateEmail = (id: number, updates: Partial<Email>) => {
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, ...updates } : email))
    )
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
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="hidden md:block">
              <div className="text-sm font-medium">Email Campaign Editor</div>
              <div className="text-xs text-muted-foreground truncate max-w-md">
                {landingUrl}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={() => setShowChat(!showChat)}
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden h-0">
        {/* Email List Sidebar */}
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
              onSelect={setSelectedEmailId}
            />
          </div>
        </aside>

        {/* Email Preview */}
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

        {/* AI Chat Assistant */}
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

      {/* Floating Chat Button */}
      {!showChat && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-2xl hover:scale-110 transition-transform animate-pulse"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      )}
    </div>
  )
}

// Helper functions to generate mock content
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
