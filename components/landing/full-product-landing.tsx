import { Header } from '@/components/sections/header'
import { FullProductHeroSection } from '@/components/sections/full-product-hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { CTASection } from '@/components/sections/cta-section'
import { FAQSection } from '@/components/sections/faq-section'
import { Footer } from '@/components/sections/footer'

export function FullProductLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FullProductHeroSection />
          <FeaturesSection />
          <PricingSection />
          <FAQSection />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
