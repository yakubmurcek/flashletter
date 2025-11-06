'use client'

import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'
import { FullProductLanding } from '@/components/landing/full-product-landing'
import { WaitlistLanding } from '@/components/landing/waitlist-landing'

export default function Home() {
  if (LANDING_PAGE_CONFIG.variant === 'full-product') {
    return <FullProductLanding />
  }
  return <WaitlistLanding />
}
