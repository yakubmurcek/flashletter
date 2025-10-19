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
