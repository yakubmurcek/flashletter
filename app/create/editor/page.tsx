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
import { createClient } from '@/lib/supabase/client'
import { EmailVersionStorageService } from '@/lib/services/email-version-storage.service'
import { isValidCampaignId } from '@/lib/utils/validation'
import { EditorHeader } from '@/components/editor/editor-header'
import { EmailSidebar, MobileEmailTabs } from '@/components/editor/email-sidebar'
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
    limitPlan,
  } = useEmailStreaming()

  const { getParam, replaceParam, getCampaignId, deleteParam } = useUrlState()

  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null)
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null)
  const hasTriggeredAutogenRef = useRef(false)

  // Use validated getters
  const campaignIdFromUrl = getCampaignId()
  const [isCompact, setIsCompact] = useState(false)
  const chatParam = getParam('chat')
  // Open by default on desktop, closed by default on small screens.
  const showChat = chatParam === 'open' || (chatParam !== 'closed' && !isCompact)
  const restoreVersionParam = getParam('restoreVersion')
  const hasProcessedRestoreRef = useRef(false)
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
    // Reset any persisted open/closed state when the editor mounts
    deleteParam('chat')
    // On phones and small tablets the panel would cover the emails, so it
    // starts closed there and opens from the floating button instead.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setIsCompact(true)
      setShouldFocusChatInput(false)
      return
    }
    // Focus the chat input on first open
    setShouldFocusChatInput(true)
  }, [deleteParam])

  // Crossing the breakpoint (resize, tablet rotation) re-applies the default
  // for the new size instead of leaving the panel over the emails.
  const deleteParamRef = useRef(deleteParam)
  deleteParamRef.current = deleteParam
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)')
    const onChange = (e: MediaQueryListEvent) => {
      setIsCompact(e.matches)
      deleteParamRef.current('chat')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

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
    replaceParam('chat', showChat ? 'closed' : 'open')
  }, [replaceParam, showChat])

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
        replaceParam('chat', 'open')
      }

      // For command actions (not "Ask AI about this"), auto-submit the action
      const isCommandAction = action !== 'Ask AI about this'
      if (isCommandAction) {
        setAutoSubmitMessage(action)
      }
    },
    [showChat, replaceParam],
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

  // Handle restoration from history page. The URL only carries an opaque
  // version UUID — we resolve subject/content server-side via Supabase, so
  // RLS enforces that the version belongs to a campaign owned by this user.
  // (The previous flow accepted JSON in the URL and applied it directly,
  // letting a crafted link overwrite arbitrary email content.) Single-shot
  // ref guard so updateEmail's state churn doesn't re-fire the effect.
  useEffect(() => {
    if (!restoreVersionParam || hasProcessedRestoreRef.current) return
    // Wait for the campaign: saving needs the email rows and the campaign id.
    if (!currentCampaignId || emails.length === 0) return
    hasProcessedRestoreRef.current = true

    const handleRestore = async () => {
      const decoded = decodeURIComponent(restoreVersionParam)
      if (!isValidCampaignId(decoded)) {
        // versionId shares the UUID v4 shape with campaignId — reject anything else.
        console.error('Invalid restoreVersion id, refusing to apply')
        deleteParam('restoreVersion')
        return
      }

      try {
        const supabase = createClient()
        const versionService = new EmailVersionStorageService(supabase)
        const version = await versionService.getVersion(decoded)
        if (!version) {
          console.error('Version not found or not accessible:', decoded)
          deleteParam('restoreVersion')
          return
        }

        // Persist through the autosave path (not just local state), so the
        // restore survives a reload and the replaced text becomes a version.
        await saveEmail(version.emailId, {
          subject: version.subject,
          content: version.content,
        })

        await restoreVersion({
          emailId: version.emailId,
          subject: version.subject,
          content: version.content,
        })

        deleteParam('restoreVersion')
      } catch (error) {
        console.error('Failed to restore version:', error)
        deleteParam('restoreVersion')
      }
    }
    handleRestore()
  }, [
    restoreVersionParam,
    saveEmail,
    restoreVersion,
    deleteParam,
    currentCampaignId,
    emails.length,
  ])

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
        title="Couldn't load this campaign"
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
        title="No campaign selected"
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
        title="This campaign is incomplete"
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

  const configPanel = (
    <CampaignConfigPanel
      config={config ?? null}
      onConfigChange={handleConfigChange}
      onRegenerate={handleRegenerate}
      isStreaming={isStreaming}
      streamedCount={streamedCount}
      totalExpected={totalExpected}
      hasEmails={emails.length > 0}
    />
  )

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
        campaignId={campaignIdFromUrl ?? undefined}
        selectedEmailDay={selectedEmail?.day}
        selectedEmailSubject={selectedEmail?.subject}
        className={cn('transition-all duration-300', showChat ? 'lg:mr-96 lg:pr-4' : 'mr-0')}
      />

      <div
        className={cn(
          'flex-1 flex overflow-hidden h-0 transition-all duration-300',
          showChat ? 'lg:mr-96' : 'mr-0',
        )}
      >
        <EmailSidebar
          emails={emails}
          selectedId={selectedEmailId}
          onSelect={handleSelectEmail}
          pendingCount={
            isStreaming && totalExpected ? Math.max(0, totalExpected - emails.length) : 0
          }
          configPanel={configPanel}
        />

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Phones: the sidebar is hidden, so settings and the email list live here. */}
          <div className="md:hidden flex-shrink-0 max-h-[60vh] overflow-y-auto bg-card">
            {configPanel}
          </div>
          <MobileEmailTabs
            emails={emails}
            selectedId={selectedEmailId}
            onSelect={handleSelectEmail}
            pendingCount={
              isStreaming && totalExpected ? Math.max(0, totalExpected - emails.length) : 0
            }
          />
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
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                limitPlan={limitPlan}
              />
            ) : null}
          </div>
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
