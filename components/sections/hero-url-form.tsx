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

export function HeroUrlForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const { analyzeLandingPage, isAnalyzing, progressState, error: analyzeError } = useLandingPage()
  const { setLandingPageData, createNewCampaign, clearAll } = useCampaign()

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

    try {
      if (!isAuthenticated) {
        await signInAnonymously()
        setIsAuthenticated(true)
      }

      const data = await analyzeLandingPage(finalUrl)
      if (!data) {
        setIsSubmitting(false)
        return
      }

      setLandingPageData(data)
      const campaignId = await createNewCampaign(data)

      router.push(`/create/configure?campaign=${campaignId}`)
    } catch (err) {
      console.error('Failed to start campaign:', err)
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
