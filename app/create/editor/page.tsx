'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'

import { EmailPreview } from '@/components/email-preview'
import { useCampaignData } from '@/lib/campaign-context'
import { useUrlState } from '@/lib/hooks/use-url-state'
import { useCampaignLoader } from '@/lib/hooks/use-campaign-loader'
import { useEmailState } from '@/lib/hooks/use-email-state'
import { useVersionTracking } from '@/lib/hooks/use-version-tracking'
import { useEmailAutosave } from '@/lib/hooks/use-email-autosave'
import { useEmailStreaming } from '@/lib/hooks/use-email-streaming'
import type { Email, SelectedContext } from '@/lib/types'
import { EditorHeader } from '@/components/editor/editor-header'
import { EmailSidebar } from '@/components/editor/email-sidebar'
import { ChatFab } from '@/components/editor/chat-fab'
import { FullScreenState } from '@/components/editor/full-screen-state'
import { GeneratingState } from '@/components/editor/generating-state'
import { CampaignConfigPanel } from '@/components/editor/campaign-config-panel'
import { useCampaignActions } from '@/lib/campaign-context'
import { cn } from '@/lib/utils'

// Dynamically import ChatSidebar to reduce initial bundle size
const ChatSidebar = dynamic(
  () =>
    import('@/components/editor/chat-sidebar').then((mod) => ({
      default: mod.ChatSidebar,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    ),
  },
)

function EditorPageContent() {
  // Use new focused hooks
  const { loadingState, campaignData, error } = useCampaignLoader()
  const { emails, selectedEmail, selectedEmailId, selectEmail, updateEmail } = useEmailState()
  const { versionCounts, restoreVersion } = useVersionTracking(emails)
  const { currentCampaignId } = useCampaignData()
  const { updateCampaignConfig } = useCampaignActions()
  const { saveEmail, isSaving } = useEmailAutosave(emails, currentCampaignId, updateEmail)
  const {
    isStreaming,
    streamedCount,
    totalExpected,
    error: streamError,
    warning: streamWarning,
    clearWarning: clearStreamWarning,
    generateEmailsStream,
  } = useEmailStreaming()

  const { getParam, toggleParam, getCampaignId, deleteParam } = useUrlState()

  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null)
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null)
  const hasTriggeredAutogenRef = useRef(false)

  // Use validated getters
  const campaignIdFromUrl = getCampaignId()
  const showChat = getParam('chat') !== 'closed' // Default to open unless explicitly closed
  const restoreParam = getParam('restore')
  const [shouldFocusChatInput, setShouldFocusChatInput] = useState(showChat)
  const openedViaAutoSelectionRef = useRef(false)
  const prevShowChatRef = useRef(showChat)
  const hasInitializedChatStateRef = useRef(false)

  // Ensure AI assistant panel is open by default on initial load
  useEffect(() => {
    if (hasInitializedChatStateRef.current) {
      return
    }
    hasInitializedChatStateRef.current = true
    // Reset any persisted "closed" state when the editor mounts
    deleteParam('chat')
    // Focus the chat input on first open
    setShouldFocusChatInput(true)
  }, [deleteParam])

  // Extract data from campaign data
  const landingPageData = campaignData?.landingPageData
  const config = campaignData?.config
  const campaignName = campaignData?.name

  // Auto-generate the sequence when arriving from the streamlined hero flow
  // (`autogen=1`). Single-shot per mount; clears the URL flag so a refresh
  // doesn't re-trigger generation.
  const autogenFlag = getParam('autogen') === '1'
  useEffect(() => {
    if (
      !autogenFlag ||
      hasTriggeredAutogenRef.current ||
      loadingState !== 'loaded' ||
      !landingPageData ||
      !config ||
      !campaignIdFromUrl ||
      emails.length > 0 ||
      isStreaming
    ) {
      return
    }
    hasTriggeredAutogenRef.current = true
    deleteParam('autogen')
    // Pass the URL-validated id (guaranteed non-null by the guard above) so the
    // stream route persists emails and the client gets back UUIDs for version
    // tracking. `currentCampaignId` is React state and can lag behind here.
    generateEmailsStream(landingPageData, config, campaignIdFromUrl)
  }, [
    autogenFlag,
    loadingState,
    landingPageData,
    config,
    emails.length,
    isStreaming,
    deleteParam,
    generateEmailsStream,
    campaignIdFromUrl,
  ])

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Define all callbacks before any early returns
  const handleSelectEmail = useCallback(
    (id: number) => {
      selectEmail(id)
    },
    [selectEmail],
  )

  const handleUpdateEmail = useCallback(
    async (id: number, updates: Partial<Email>, skipVersioning = false) => {
      await saveEmail(id, updates, skipVersioning)
    },
    [saveEmail],
  )

  const handleToggleChat = useCallback(() => {
    if (showChat) {
      setShouldFocusChatInput(false)
    } else {
      setShouldFocusChatInput(true)
    }
    openedViaAutoSelectionRef.current = false
    toggleParam('chat', 'closed')
  }, [toggleParam, showChat])

  const handleTextSelected = useCallback(
    (
      text: string,
      action: string,
      meta?: {
        shouldFocus?: boolean
      },
    ) => {
      setSelectedContext({ text, action })
      const shouldFocus =
        meta?.shouldFocus !== undefined ? meta.shouldFocus : action !== 'Ask AI about this'
      setShouldFocusChatInput(shouldFocus)

      if (!showChat) {
        openedViaAutoSelectionRef.current = !shouldFocus
        deleteParam('chat') // Remove 'closed' parameter to open chat
      }

      // For command actions (not "Ask AI about this"), auto-submit the action
      const isCommandAction = action !== 'Ask AI about this'
      if (isCommandAction) {
        setAutoSubmitMessage(action)
      }
    },
    [showChat, deleteParam],
  )

  const handleClearContext = useCallback(() => {
    setSelectedContext(null)
    setShouldFocusChatInput(false)
  }, [])

  const handleFocusHandled = useCallback(() => {
    setShouldFocusChatInput(false)
  }, [])

  const handleAutoSubmitComplete = useCallback(() => {
    setAutoSubmitMessage(null)
  }, [])

  const handleConfigChange = useCallback(
    (next: import('@/lib/types').CampaignConfig) => {
      updateCampaignConfig(next)
    },
    [updateCampaignConfig],
  )

  const handleRegenerate = useCallback(() => {
    if (!landingPageData || !config || isStreaming) return
    // Same reason as the autogen effect: prefer the URL-validated id so the
    // server can persist emails and the client gets back UUIDs for versioning.
    generateEmailsStream(landingPageData, config, campaignIdFromUrl)
  }, [landingPageData, config, isStreaming, generateEmailsStream, campaignIdFromUrl])

  useEffect(() => {
    if (showChat && !prevShowChatRef.current) {
      if (openedViaAutoSelectionRef.current) {
        openedViaAutoSelectionRef.current = false
      } else {
        setShouldFocusChatInput(true)
      }
    }
    prevShowChatRef.current = showChat
  }, [showChat])

  // Handle restoration from history page
  useEffect(() => {
    if (restoreParam) {
      const handleRestore = async () => {
        try {
          // Safe JSON parsing with validation
          let restoreData
          try {
            restoreData = JSON.parse(decodeURIComponent(restoreParam))
          } catch (parseError) {
            console.error('Failed to parse restore data:', parseError)
            return
          }

          // Validate restore data structure
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

            // Clean up restore param to prevent re-processing on refresh
            deleteParam('restore')
          } else {
            console.error('Invalid restore data structure:', restoreData)
          }
        } catch (error) {
          console.error('Failed to restore version:', error)
        }
      }
      handleRestore()
    }
  }, [restoreParam, updateEmail, restoreVersion, deleteParam])

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
      <FullScreenState
        title="Error Loading Campaign"
        message={error || 'Failed to load campaign data'}
        actionHref="/campaigns"
        actionLabel="Back to Campaigns"
      />
    )
  }

  // Show error state if no campaign ID is provided
  if (!campaignIdFromUrl) {
    return (
      <FullScreenState
        title="No Campaign Selected"
        message="Please select a campaign to edit from the campaigns page."
        actionHref="/campaigns"
        actionLabel="Back to Campaigns"
      />
    )
  }

  // Show error state if we have no essential data after loading is complete.
  // Skip while we're auto-generating from the hero flow (config exists but
  // emails are still streaming in).
  if (loadingState === 'loaded' && !config && emails.length === 0 && !isStreaming && !autogenFlag) {
    return (
      <FullScreenState
        title="Campaign Data Missing"
        message="This campaign appears to be incomplete. It's missing both configuration and email data."
        actionHref="/campaigns"
        actionLabel="Back to Campaigns"
        details={{
          'Landing Page Data': !!landingPageData,
          'Campaign Config': !!config,
          Emails: emails.length,
          'Campaign ID': campaignIdFromUrl || 'None',
        }}
      />
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <EditorHeader
        landingPageUrl={landingPageData?.url}
        historyHref={
          campaignIdFromUrl
            ? `/create/history?emailId=${selectedEmailId}&campaign=${campaignIdFromUrl}`
            : `/create/history?emailId=${selectedEmailId}`
        }
        versionCount={versionCounts[selectedEmailId] || 0}
        campaignName={campaignName || undefined}
        className={cn('transition-all duration-300', showChat ? 'mr-96 pr-4' : 'mr-0')}
      />

      <div
        className={cn(
          'flex-1 flex overflow-hidden h-0 transition-all duration-300',
          showChat ? 'mr-96' : 'mr-0',
        )}
      >
        <EmailSidebar
          emails={emails}
          selectedId={selectedEmailId}
          onSelect={handleSelectEmail}
          configPanel={
            <CampaignConfigPanel
              config={config ?? null}
              onConfigChange={handleConfigChange}
              onRegenerate={handleRegenerate}
              isStreaming={isStreaming}
              streamedCount={streamedCount}
              totalExpected={totalExpected}
            />
          }
        />

        <main className="flex-1 overflow-y-auto">
          {streamWarning && (
            <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm flex items-center justify-between gap-3">
              <span className="text-destructive">⚠️ {streamWarning}</span>
              <button
                type="button"
                onClick={clearStreamWarning}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Dismiss
              </button>
            </div>
          )}
          {selectedEmail ? (
            <EmailPreview
              email={selectedEmail}
              onUpdate={(updates) => handleUpdateEmail(selectedEmail.id, updates)}
              onTextSelected={handleTextSelected}
              isSaving={isSaving}
            />
          ) : isStreaming || streamError || (autogenFlag && emails.length === 0) ? (
            <GeneratingState
              streamedCount={streamedCount}
              totalExpected={totalExpected}
              error={streamError}
            />
          ) : null}
        </main>

        <ChatSidebar
          isOpen={showChat}
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
          email={selectedEmail || undefined}
          campaignType={config?.campaignType}
          onApplyEdits={(edits) => {
            if (selectedEmail) {
              handleUpdateEmail(selectedEmail.id, edits)
            }
          }}
          selectedContext={selectedContext}
          onClearContext={handleClearContext}
          autoSubmitMessage={autoSubmitMessage}
          onAutoSubmitComplete={handleAutoSubmitComplete}
          shouldFocusInput={shouldFocusChatInput}
          onFocusHandled={handleFocusHandled}
        />
      </div>

      {!showChat && <ChatFab onClick={handleToggleChat} />}
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}
    >
      <EditorPageContent />
    </Suspense>
  )
}
