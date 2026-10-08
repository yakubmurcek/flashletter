import { Header } from '@/components/sections/header'
import { WaitlistHeroSection } from '@/components/sections/waitlist-hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { FAQSection } from '@/components/sections/faq-section'
import { Footer } from '@/components/sections/footer'

export function WaitlistLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <WaitlistHeroSection />
          <FeaturesSection />
          <FAQSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
