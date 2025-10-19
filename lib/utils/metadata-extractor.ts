import * as cheerio from 'cheerio'

/**
 * Comprehensive metadata extraction from HTML
 * Extracts basic meta tags, Open Graph, Twitter Cards, JSON-LD, and favicon
 */

export interface ExtractedMetadata {
  title?: string
  description?: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  ogUrl?: string
  ogSiteName?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  twitterSite?: string
  twitterCreator?: string
  favicon?: string
  structuredData?: any[]
  canonicalUrl?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

/**
 * Extract comprehensive metadata from HTML
 * @param html Raw HTML content
 * @param baseUrl Base URL for resolving relative URLs
 * @returns Extracted metadata object
 */
export function extractMetadata(
  html: string,
  baseUrl?: string
): ExtractedMetadata {
  const $ = cheerio.load(html)
  const metadata: ExtractedMetadata = {}

  // Basic meta tags
  metadata.title = extractTitle($)
  metadata.description = extractDescription($)
  metadata.keywords = extractKeywords($)
  metadata.author = extractAuthor($)
  metadata.canonicalUrl = extractCanonicalUrl($)

  // Open Graph tags
  metadata.ogTitle = extractMetaContent($, 'og:title')
  metadata.ogDescription = extractMetaContent($, 'og:description')
  metadata.ogImage = extractMetaContent($, 'og:image')
  metadata.ogType = extractMetaContent($, 'og:type')
  metadata.ogUrl = extractMetaContent($, 'og:url')
  metadata.ogSiteName = extractMetaContent($, 'og:site_name')

  // Twitter Card tags
  metadata.twitterCard = extractMetaContent($, 'twitter:card')
  metadata.twitterTitle = extractMetaContent($, 'twitter:title')
  metadata.twitterDescription = extractMetaContent($, 'twitter:description')
  metadata.twitterImage = extractMetaContent($, 'twitter:image')
  metadata.twitterSite = extractMetaContent($, 'twitter:site')
  metadata.twitterCreator = extractMetaContent($, 'twitter:creator')

  // Favicon
  metadata.favicon = extractFavicon($, baseUrl)

  // Structured data (JSON-LD)
  metadata.structuredData = extractStructuredData($)

  // Article metadata
  metadata.publishedTime = extractMetaContent($, 'article:published_time')
  metadata.modifiedTime = extractMetaContent($, 'article:modified_time')

  // Resolve relative URLs if baseUrl is provided
  if (baseUrl) {
    metadata.ogImage = resolveUrl(metadata.ogImage, baseUrl)
    metadata.twitterImage = resolveUrl(metadata.twitterImage, baseUrl)
    metadata.favicon = resolveUrl(metadata.favicon, baseUrl)
  }

  return metadata
}

/**
 * Extract page title
 */
function extractTitle($: cheerio.CheerioAPI): string | undefined {
  // Try og:title first, then regular title
  const ogTitle = extractMetaContent($, 'og:title')
  if (ogTitle) return ogTitle

  const title = $('title').first().text().trim()
  return title || undefined
}

/**
 * Extract page description
 */
function extractDescription($: cheerio.CheerioAPI): string | undefined {
  // Try og:description first, then meta description
  const ogDesc = extractMetaContent($, 'og:description')
  if (ogDesc) return ogDesc

  const desc = extractMetaContent($, 'description')
  return desc || undefined
}

/**
 * Extract keywords
 */
function extractKeywords($: cheerio.CheerioAPI): string[] | undefined {
  const keywords = extractMetaContent($, 'keywords')
  if (!keywords) return undefined

  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
}

/**
 * Extract author information
 */
function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  // Try various author meta tags
  const authorSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[name="twitter:creator"]',
    'meta[property="og:article:author"]',
  ]

  for (const selector of authorSelectors) {
    const author = $(selector).attr('content')
    if (author) return author.trim()
  }

  return undefined
}

/**
 * Extract canonical URL
 */
function extractCanonicalUrl($: cheerio.CheerioAPI): string | undefined {
  return $('link[rel="canonical"]').attr('href') || undefined
}

/**
 * Extract favicon URL
 */
function extractFavicon(
  $: cheerio.CheerioAPI,
  baseUrl?: string
): string | undefined {
  // Try various favicon link tags
  const faviconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ]

  for (const selector of faviconSelectors) {
    const href = $(selector).attr('href')
    if (href) {
      return resolveUrl(href, baseUrl)
    }
  }

  // Fallback to default favicon
  if (baseUrl) {
    return new URL('/favicon.ico', baseUrl).toString()
  }

  return undefined
}

/**
 * Extract structured data (JSON-LD)
 */
function extractStructuredData($: cheerio.CheerioAPI): any[] {
  const structuredData: any[] = []

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const content = $(element).html()
      if (content) {
        const data = JSON.parse(content)
        if (Array.isArray(data)) {
          structuredData.push(...data)
        } else {
          structuredData.push(data)
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error)
    }
  })

  return structuredData
}

/**
 * Extract meta content by property or name
 */
function extractMetaContent(
  $: cheerio.CheerioAPI,
  property: string
): string | undefined {
  // Try property attribute first (Open Graph, etc.)
  let content = $(`meta[property="${property}"]`).attr('content')
  if (content) return content.trim()

  // Try name attribute (standard meta tags)
  content = $(`meta[name="${property}"]`).attr('content')
  if (content) return content.trim()

  return undefined
}

/**
 * Resolve relative URL to absolute URL
 */
function resolveUrl(
  url: string | undefined,
  baseUrl: string | undefined
): string | undefined {
  if (!url || !baseUrl) return url

  try {
    return new URL(url, baseUrl).toString()
  } catch (error) {
    console.warn('Failed to resolve URL:', url, 'with base:', baseUrl)
    return url
  }
}

/**
 * Get the most relevant title from metadata
 * Prioritizes Open Graph title, then regular title
 */
export function getBestTitle(metadata: ExtractedMetadata): string | undefined {
  return metadata.ogTitle || metadata.title
}

/**
 * Get the most relevant description from metadata
 * Prioritizes Open Graph description, then regular description
 */
export function getBestDescription(
  metadata: ExtractedMetadata
): string | undefined {
  return metadata.ogDescription || metadata.description
}

/**
 * Get the most relevant image from metadata
 * Prioritizes Open Graph image, then Twitter image
 */
export function getBestImage(metadata: ExtractedMetadata): string | undefined {
  return metadata.ogImage || metadata.twitterImage
}
