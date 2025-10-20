import * as cheerio from 'cheerio'
import { LANDING_PAGE_CONTENT_LIMIT } from '@/lib/constants/app'

/**
 * Smart content extraction using cheerio for better HTML parsing
 * Prioritizes main content and removes noise elements
 */

export interface ScrapedContent {
  content: string
  wordCount: number
  extractionMethod: 'static'
}

/**
 * Extract clean text content from HTML with smart prioritization
 * @param html Raw HTML content
 * @returns Clean text content with word count
 */
export function extractTextFromHTML(html: string): ScrapedContent {
  const $ = cheerio.load(html)

  // Remove unwanted elements that add noise
  const noiseSelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    'aside',
    '.advertisement',
    '.ads',
    '.ad',
    '.cookie-banner',
    '.cookie-notice',
    '.popup',
    '.modal',
    '.sidebar',
    '.navigation',
    '.menu',
    '.social-share',
    '.share-buttons',
    '.comments',
    '.comment-section',
    '.related-posts',
    '.recommendations',
    '.newsletter-signup',
    '.email-signup',
    '[role="banner"]',
    '[role="navigation"]',
    '[role="complementary"]',
    '[role="contentinfo"]',
  ]

  // Remove noise elements
  noiseSelectors.forEach((selector) => {
    $(selector).remove()
  })

  // Prioritize main content areas
  const contentSelectors = [
    'main',
    'article',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.page-content',
    '.text-content',
    '[role="main"]',
    'section',
    '.section',
  ]

  let mainContent = ''

  // Try to find main content area first
  for (const selector of contentSelectors) {
    const element = $(selector).first()
    if (element.length > 0) {
      mainContent = extractTextFromElement(element, $)
      if (mainContent.trim().length > 100) {
        break
      }
    }
  }

  // Fallback to body if no main content found
  if (!mainContent || mainContent.trim().length < 100) {
    mainContent = extractTextFromElement($('body'), $)
  }

  // Clean and normalize text
  const cleanedContent = cleanText(mainContent)

  // Smart truncation at sentence boundaries
  const truncatedContent = smartTruncate(
    cleanedContent,
    LANDING_PAGE_CONTENT_LIMIT
  )

  return {
    content: truncatedContent,
    wordCount: countWords(truncatedContent),
    extractionMethod: 'static',
  }
}

/**
 * Extract text from a cheerio element while preserving structure
 */
function extractTextFromElement(
  element: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): string {
  let text = ''

  element.contents().each((_, node) => {
    if (node.type === 'text') {
      text += node.data || ''
    } else if (node.type === 'tag') {
      const tagName = node.name.toLowerCase()

      // Add line breaks for block elements
      if (
        ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br'].includes(
          tagName
        )
      ) {
        text += '\n'
      }

      // Recursively extract text from child elements
      text += extractTextFromElement($(node), $)

      // Add line breaks after block elements
      if (
        ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tagName)
      ) {
        text += '\n'
      }
    }
  })

  return text
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
    .trim()
}

/**
 * Smart truncation that respects sentence boundaries
 */
function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  // Find the last complete sentence within the limit
  const truncated = text.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )

  // If we found a sentence boundary within reasonable distance, use it
  if (lastSentenceEnd > maxLength * 0.8) {
    return text.substring(0, lastSentenceEnd + 1).trim()
  }

  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.9) {
    return text.substring(0, lastSpace).trim() + '...'
  }

  // Fallback to hard truncation
  return truncated.trim() + '...'
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

/**
 * Check if content appears to be meaningful (not just navigation/ads)
 */
export function isContentMeaningful(content: string): boolean {
  const wordCount = countWords(content)

  // Must have at least 50 words to be considered meaningful
  if (wordCount < 50) {
    return false
  }

  // Check for common content indicators
  const contentIndicators = [
    /\b(article|post|content|text|paragraph|section)\b/i,
    /\b(about|description|details|information|overview)\b/i,
    /\b(how|what|why|when|where|who)\b/i,
  ]

  const hasContentIndicators = contentIndicators.some((pattern) =>
    pattern.test(content)
  )

  // Check for too many navigation-like words
  const navWords = (
    content.match(/\b(home|about|contact|menu|login|signup|search)\b/gi) || []
  ).length
  const navRatio = navWords / wordCount

  return hasContentIndicators && navRatio < 0.1
}
