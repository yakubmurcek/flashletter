'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createClient, signInAnonymously } from '@/lib/supabase/client'
import { useLandingPage } from '@/lib/hooks/use-landing-page'
import { ScrapeProgressOverlay } from '@/components/campaign/scrape-progress-overlay'
import { useCampaign } from '@/lib/campaign-context'
import { SMART_DEFAULT_CAMPAIGN_CONFIG } from '@/lib/constants/campaign'
import { track } from '@/lib/analytics'
import { getCleanDomain } from '@/lib/types/scrape-progress'

export function HeroUrlForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    analyzeLandingPage,
    isAnalyzing,
    progressState,
    error: analyzeError,
    lastResultRef,
  } = useLandingPage()
  const { setLandingPageData, createNewCampaign, clearAll, applyConfigToCampaign } = useCampaign()

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount
  useEffect(() => {
    // Keep anything typed into the server-rendered input before hydration.
    const typed = inputRef.current?.value
    if (typed) setUrl(typed)
    clearAll()
  }, [])

  // "Try free" links point at #try: land on the box with the cursor in it.
  useEffect(() => {
    const focusIfTargeted = () => {
      if (window.location.hash !== '#try') return
      inputRef.current?.scrollIntoView({ block: 'center' })
      inputRef.current?.focus({ preventScroll: true })
    }
    // Next's <Link> changes the hash with pushState, which fires no hashchange,
    // so same-page clicks on a #try link are caught here instead.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href$="#try"]')) {
        window.setTimeout(focusIfTargeted, 50)
      }
    }
    focusIfTargeted()
    window.addEventListener('hashchange', focusIfTargeted)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', focusIfTargeted)
      document.removeEventListener('click', onClick)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    let finalUrl = trimmedUrl
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`
    }

    setIsSubmitting(true)
    setError(null)

    const domain = getCleanDomain(finalUrl)
    track('url_pasted', { domain })

    try {
      const {
        data: { user },
      } = await createClient().auth.getUser()
      if (!user) {
        await signInAnonymously()
      }

      const data = await analyzeLandingPage(finalUrl)
      if (!data) {
        // analyzeLandingPage returns null for both real failures AND user
        // aborts (component unmount, repeat-submit). Only count the former
        // — aborted scrapes aren't drop-offs in any funnel sense.
        if (lastResultRef.current === 'failure') {
          track('scrape_failed', { domain, stage: 'scrape' })
        }
        setIsSubmitting(false)
        return
      }

      track('scrape_succeeded', { domain })

      setLandingPageData(data)
      const campaignId = await createNewCampaign(data)

      // Apply smart defaults so the editor has a config to render against —
      // skips the Configure page entirely. User can tweak in the editor sidebar
      // and regenerate. Use the id-explicit variant because `currentCampaignId`
      // state may not have propagated to the hook closure yet.
      await applyConfigToCampaign(campaignId, { ...SMART_DEFAULT_CAMPAIGN_CONFIG })

      router.push(`/create/editor?campaign=${campaignId}&email=1&autogen=1`)
    } catch (err) {
      console.error('Failed to start campaign:', err)
      // Track failures that happen outside the scrape itself (signInAnonymously,
      // createNewCampaign, applyConfigToCampaign) so the funnel doesn't show
      // a stranded `url_pasted` with no follow-up event. `stage` discriminates
      // between scrape and pre/post-scrape failures so analytics can split.
      track('scrape_failed', {
        domain,
        stage: 'pre_scrape_or_post_scrape',
        error: err instanceof Error ? err.message : 'unknown',
      })
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isAnalyzing
  const displayError = error || analyzeError

  return (
    <>
      <ScrapeProgressOverlay
        isOpen={isAnalyzing}
        progressState={progressState}
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl mx-auto"
      >
        <div
          className="
            relative flex items-center gap-1 p-1
            rounded-full border border-border bg-background
            shadow-sm focus-within:border-primary
            focus-within:ring-2 focus-within:ring-primary/20
            transition-colors
          "
        >
          <Input
            ref={inputRef}
            id="try"
            aria-label="Your landing page URL"
            type="text"
            placeholder="https://your-landing-page.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="
              flex-1 h-11 border-0 bg-transparent shadow-none
              focus-visible:ring-0 focus-visible:border-0
              text-base px-4
            "
            required
            autoFocus
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="rounded-full h-11 px-5 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        {displayError && (
          <p className="text-sm text-destructive mt-3 text-center">{displayError}</p>
        )}
        <p className="text-sm text-muted-foreground mt-3 text-center">
          No signup. Try it in your browser.
        </p>
      </form>
    </>
  )
}
