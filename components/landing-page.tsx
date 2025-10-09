"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Mail, Zap } from "lucide-react"
import { URLInputStep } from "./url-input-step"
import { ConfigurationStep } from "./configuration-step"
import { EmailEditor } from "./email-editor"

export function LandingPage() {
  const [currentStep, setCurrentStep] = useState<"landing" | "url" | "config" | "editor">("landing")
  const [landingUrl, setLandingUrl] = useState("")
  const [config, setConfig] = useState<{
    tone: string
    campaignType: string
    days: number
  } | null>(null)

  const handleStart = () => {
    setCurrentStep("url")
  }

  const handleUrlSubmit = (url: string) => {
    setLandingUrl(url)
    setCurrentStep("config")
  }

  const handleConfigSubmit = (configuration: { tone: string; campaignType: string; days: number }) => {
    setConfig(configuration)
    setCurrentStep("editor")
  }

  if (currentStep === "url") {
    return <URLInputStep onSubmit={handleUrlSubmit} onBack={() => setCurrentStep("landing")} />
  }

  if (currentStep === "config") {
    return (
      <ConfigurationStep landingUrl={landingUrl} onSubmit={handleConfigSubmit} onBack={() => setCurrentStep("url")} />
    )
  }

  if (currentStep === "editor" && config) {
    return <EmailEditor landingUrl={landingUrl} config={config} onBack={() => setCurrentStep("config")} />
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">CampaignAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </a>
          </nav>
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center py-20 md:py-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Email Campaigns</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
            Generate email campaigns in <span className="text-primary">seconds</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
            Transform your landing page into a complete email campaign. AI analyzes your content and creates
            personalized email sequences that convert.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleStart} className="gap-2 text-base">
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base bg-transparent">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 pb-20">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground leading-relaxed">
              Generate complete email campaigns in seconds. No more hours spent writing copy.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-muted-foreground leading-relaxed">
              Advanced AI analyzes your landing page and creates contextually relevant emails.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fully Editable</h3>
            <p className="text-muted-foreground leading-relaxed">
              Customize every aspect of your emails with our intuitive editor and AI assistant.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
