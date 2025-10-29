"use client"

import { Header } from '@/components/sections/header'
import { WaitlistHeroSection } from '@/components/sections/waitlist-hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { FAQSection } from '@/components/sections/faq-section'
import { Footer } from '@/components/sections/footer'

export function WaitlistLanding() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
        <WaitlistHeroSection />
        <FeaturesSection />
        <FAQSection />
      </main>

      <Footer />
    </div>
  )
}


