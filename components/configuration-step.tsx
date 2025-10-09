"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Settings, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface ConfigurationStepProps {
  landingUrl: string
  onSubmit: (config: { tone: string; campaignType: string; days: number }) => void
  onBack: () => void
}

export function ConfigurationStep({ landingUrl, onSubmit, onBack }: ConfigurationStepProps) {
  const [tone, setTone] = useState("professional")
  const [campaignType, setCampaignType] = useState("nurture")
  const [days, setDays] = useState([7])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
    onSubmit({ tone, campaignType, days: days[0] })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="text-sm text-muted-foreground truncate max-w-md">{landingUrl}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 flex items-center justify-center py-8">
        <div className="w-full max-w-2xl">
          {/* Progress Indicator */}
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
              <h2 className="text-3xl font-bold mb-3">Configure your campaign</h2>
              <p className="text-muted-foreground text-balance leading-relaxed">
                Customize the tone, type, and duration of your email campaign to match your goals.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Tone Selection */}
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
                <p className="text-sm text-muted-foreground">Choose the tone that best fits your brand voice</p>
              </div>

              {/* Campaign Type */}
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
                    <SelectItem value="onboarding">Onboarding Series</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="re-engagement">Re-engagement</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Select the goal of your email campaign</p>
              </div>

              {/* Campaign Duration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="days" className="text-base">
                    Campaign Duration
                  </Label>
                  <span className="text-2xl font-bold text-primary">{days[0]} days</span>
                </div>
                <Slider id="days" min={3} max={30} step={1} value={days} onValueChange={setDays} className="py-4" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3 days</span>
                  <span>30 days</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll generate {days[0]} emails, one for each day of your campaign
                </p>
              </div>

              {/* Preview Card */}
              <Card className="bg-muted/50 p-6 border-border">
                <h3 className="font-semibold mb-3">Campaign Preview</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tone:</span>
                    <span className="font-medium capitalize">{tone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{campaignType.replace("-", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emails:</span>
                    <span className="font-medium">{days[0]} emails</span>
                  </div>
                </div>
              </Card>

              <Button type="submit" size="lg" className="w-full gap-2" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Campaign...
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
