'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import Link from 'next/link'
import { useCampaign } from '@/lib/campaign-context'
import type { Email } from '@/lib/types'

export default function ConfigurePage() {
  const router = useRouter()
  const { landingPageData, setConfig, setGeneratedEmails } = useCampaign()
  const [tone, setTone] = useState('professional')
  const [campaignType, setCampaignType] = useState('nurture')
  const [days, setDays] = useState([7])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!landingPageData) {
      router.push('/create')
    }
  }, [landingPageData, router])

  if (!landingPageData) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          landingUrl: landingPageData.url,
          landingContent: landingPageData.content,
          config: {
            tone,
            campaignType,
            days: days[0],
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate emails')
      }

      const data = await response.json()

      const emails: Email[] = data.emails.map((email: any, index: number) => ({
        id: index + 1,
        day: email.day || index + 1,
        subject: email.subject || `Email ${index + 1}`,
        preview: email.preview || email.subject || '',
        content: email.content || '',
      }))

      setConfig({ tone, campaignType, days: days[0] })
      setGeneratedEmails(emails)
      router.push('/create/editor')
    } catch (err) {
      console.error('Error generating emails:', err)
      setError(
        'Failed to generate emails. Please make sure your OpenAI API key is configured and try again.'
      )
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/create">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground truncate max-w-md">
            {landingPageData.url}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 flex items-center justify-center py-8">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="text-sm text-muted-foreground">URL Input</span>
            </div>
            <div className="w-12 h-px bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="text-sm font-medium">Configuration</span>
            </div>
            <div className="w-12 h-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="text-sm text-muted-foreground">Generate</span>
            </div>
          </div>

          <Card className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3">
                Configure your campaign
              </h2>
              <p className="text-muted-foreground text-balance leading-relaxed">
                Customize the tone, type, and duration of your email campaign to
                match your goals.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="tone" className="text-base">
                  Campaign Tone
                </Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose the tone that best fits your brand voice
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="campaign-type" className="text-base">
                  Campaign Type
                </Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger id="campaign-type" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurture">Nurture Campaign</SelectItem>
                    <SelectItem value="onboarding">
                      Onboarding Series
                    </SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="re-engagement">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the goal of your email campaign
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="days" className="text-base">
                    Campaign Duration
                  </Label>
                  <span className="text-2xl font-bold text-primary">
                    {days[0]} days
                  </span>
                </div>
                <Slider
                  id="days"
                  min={3}
                  max={30}
                  step={1}
                  value={days}
                  onValueChange={setDays}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3 days</span>
                  <span>30 days</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll generate {days[0]} emails, one for each day of your
                  campaign
                </p>
              </div>

              <Card className="bg-muted/50 p-6 border-border">
                <h3 className="font-semibold mb-3">Campaign Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tone:</span>
                    <span className="font-medium capitalize">{tone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">
                      {campaignType.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emails:</span>
                    <span className="font-medium">{days[0]} emails</span>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Campaign with AI...
                  </>
                ) : (
                  <>
                    Generate Campaign
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}
