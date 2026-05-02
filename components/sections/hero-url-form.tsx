'use client'

import { useState, useEffect, FormEvent } from 'react'
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const {
    analyzeLandingPage,
    isAnalyzing,
    progressState,
    error: analyzeError,
    lastResultRef,
  } = useLandingPage()
  const { setLandingPageData, createNewCampaign, clearAll, applyConfigToCampaign } = useCampaign()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    clearAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!isAuthenticated) {
        await signInAnonymously()
        setIsAuthenticated(true)
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
            disabled={isLoading || isAuthenticated === null}
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
