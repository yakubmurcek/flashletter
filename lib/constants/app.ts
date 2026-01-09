// Application constants for magic numbers and limits

export const MESSAGE_HISTORY_LIMIT = 5
export const LANDING_PAGE_CONTENT_LIMIT = 10000
export const EMAIL_CONTENT_PREVIEW_LIMIT = 200
export const CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT = 1500
export const EMAIL_SAVE_DEBOUNCE_MS = 1000

// Scraping constants
export const SCRAPE_CACHE_TTL = 60 * 60 * 24 // 24 hours in seconds
export const PLAYWRIGHT_TIMEOUT = 10000 // 10 seconds in milliseconds
export const MIN_CONTENT_LENGTH = 50 // Minimum words to consider content meaningful
export const MAX_CACHE_ENTRIES = 1000 // Maximum number of cache entries

// Feature flags configuration
export const FEATURE_FLAGS = {
  // Landing page variant - single flag to control the main experience
  SHOW_FULL_PRODUCT: true, // true = full product, false = waitlist
  IS_LAUNCHED: true, // app launch status

  // Beta features
  ENABLE_BETA_FEATURES: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES === 'true',

  // Waitlist features (only relevant when SHOW_FULL_PRODUCT is false)
  ENABLE_WAITLIST_ORDER: process.env.NEXT_PUBLIC_ENABLE_WAITLIST_ORDER === 'true',
  ENABLE_REGION_DETECTION: process.env.NEXT_PUBLIC_ENABLE_REGION_DETECTION === 'true',

  // Analytics and tracking
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_SENTRY: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true',
} as const

// Landing page configuration based on feature flags
export const LANDING_PAGE_CONFIG = {
  // Single source of truth for landing page variant
  variant: FEATURE_FLAGS.SHOW_FULL_PRODUCT ? 'full-product' : 'waitlist',

  // Derived configurations
  showWaitlist: !FEATURE_FLAGS.SHOW_FULL_PRODUCT,
  showProductFeatures: FEATURE_FLAGS.SHOW_FULL_PRODUCT,
  showWaitlistOrder: FEATURE_FLAGS.ENABLE_WAITLIST_ORDER,
  enableRegionDetection: FEATURE_FLAGS.ENABLE_REGION_DETECTION,
} as const

// Type definitions for better TypeScript support
export type FeatureFlag = keyof typeof FEATURE_FLAGS
export type LandingPageVariant = 'waitlist' | 'full-product'
