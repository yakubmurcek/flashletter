import type { Metadata } from 'next'
import { Header } from '@/components/sections/header'
import { Footer } from '@/components/sections/footer'
import { PricingSection } from '@/components/sections/pricing-section'
import { FAQSection } from '@/components/sections/faq-section'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free. Flashletter Pro is $19/month for unlimited AI email campaigns.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <PricingSection
            headingLevel="h1"
            animate={false}
          />
          <FAQSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
