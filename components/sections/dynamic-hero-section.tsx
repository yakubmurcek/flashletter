'use client'

import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'
import { WaitlistHeroSection } from './waitlist-hero-section'
import { FullProductHeroSection } from './full-product-hero-section'

export function DynamicHeroSection() {
  // Determine which hero section to show based on feature flags
  if (LANDING_PAGE_CONFIG.variant === 'full-product') {
    return <FullProductHeroSection />
  }

  // Default to waitlist version
  return <WaitlistHeroSection />
}
