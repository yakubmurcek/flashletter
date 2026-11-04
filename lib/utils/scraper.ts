import * as cheerio from 'cheerio'
import { AnyNode } from 'domhandler'
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
 * Extract clean structured content from HTML with smart prioritization
 * @param html Raw HTML content
 * @param baseUrl The page's final URL (after redirects). Every link is resolved
 *   against it, so the content (and the emails written from it) never carries
 *   a relative href that dies once pasted into an email.
 * @returns Structured HTML content with word count
 */
export function extractTextFromHTML(html: string, baseUrl?: string): ScrapedContent {
  const $ = cheerio.load(html)

  removeNoiseElements($)
  resolveLinks($, baseUrl)

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
  ]

  let mainElement: cheerio.Cheerio<AnyNode> | null = null
  let structuredHtml = ''

  for (const selector of contentSelectors) {
    const candidate = $(selector)
    // Only a single match can be the page's main content. Several matches are
    // repeated blocks (cards, sections); taking the first one dropped the
    // rest of the page, so fall through to the whole body instead.
    if (candidate.length !== 1) {
      continue
    }

    const candidateHtml = buildStructuredHtml(candidate, $).trim()
    if (!candidateHtml) {
      continue
    }

    mainElement = candidate
    structuredHtml = candidateHtml

    const candidateTextLength = cleanPlainText(candidate.text()).length
    if (candidateTextLength > 100) {
      break
    }
  }

  if (!structuredHtml) {
    mainElement = $('body')
    structuredHtml = buildStructuredHtml(mainElement, $)
  }

  const cleanedHtml = normalizeHtml(structuredHtml)
  const plainText = cleanPlainText(cheerio.load(`<div>${cleanedHtml}</div>`).text())

  const truncation = smartTruncateWithMetadata(plainText, LANDING_PAGE_CONTENT_LIMIT)

  const truncatedHtml = truncation.truncated
    ? truncateHtmlByTextLength(cleanedHtml, truncation.cutoff, truncation.appendEllipsis)
    : cleanedHtml

  const finalContent = normalizeHtml(truncatedHtml)

  return {
    content: finalContent,
    wordCount: countWords(truncation.text),
    extractionMethod: 'static',
  }
}

function removeNoiseElements($: cheerio.CheerioAPI): void {
  const noiseSelectors = [
    'script',
    'style',
    'nav',
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

  noiseSelectors.forEach((selector) => {
    $(selector).remove()
  })

  // The site header (logo, menu links) is noise, but a <header> inside the
  // content is usually a hero or section heading, so keep those.
  $('header')
    .filter((_, el) => $(el).parents('main, article, section, [role="main"]').length === 0)
    .remove()
}

const BLOCK_TAGS = 'h1,h2,h3,h4,h5,h6,p,div,section,article,ul,ol,li,table,blockquote'

function buildStructuredHtml(element: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string {
  const parts: string[] = []

  element.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = normalizeInlineText(node.data || '')
      if (text.trim().length > 0) {
        parts.push(`<p>${escapeHtml(text.trim())}</p>`)
      }
      return
    }

    if (node.type !== 'tag') {
      return
    }

    const tagName = node.name.toLowerCase()

    if (['h1', 'h2', 'h3'].includes(tagName)) {
      const content = sanitizeInlineContent($(node), $)
      if (content) {
        parts.push(`<${tagName}>${content}</${tagName}>`)
      }
      return
    }

    if (['h4', 'h5', 'h6'].includes(tagName)) {
      const content = sanitizeInlineContent($(node), $)
      if (content) {
        parts.push(`<h3>${content}</h3>`)
      }
      return
    }

    if (tagName === 'p' || tagName === 'span') {
      const content = sanitizeInlineContent($(node), $)
      if (content) {
        parts.push(`<p>${content}</p>`)
      }
      return
    }

    // A bare CTA link straight inside a block (a button-styled <a> in a hero)
    // keeps its href; recursing into it below would keep only its text.
    // Links that wrap whole cards (headings, paragraphs) still recurse.
    if (tagName === 'a' && $(node).find(BLOCK_TAGS).length === 0) {
      const wrapper = $('<span></span>').append($(node).clone())
      const content = sanitizeInlineContent(wrapper, $)
      if (content) {
        parts.push(`<p>${content}</p>`)
      }
      return
    }

    if (tagName === 'ul' || tagName === 'ol') {
      const listHtml = buildList($(node), tagName, $)
      if (listHtml) {
        parts.push(listHtml)
      }
      return
    }

    if (tagName === 'li') {
      const listHtml = buildList($(node), 'ul', $)
      if (listHtml) {
        parts.push(listHtml)
      }
      return
    }

    const childContent = buildStructuredHtml($(node), $)
    if (childContent.trim()) {
      parts.push(childContent)
    }
  })

  return parts.join('\n').replace(/\n{3,}/g, '\n\n')
}

function buildList(
  element: cheerio.Cheerio<AnyNode>,
  listTag: string,
  $: cheerio.CheerioAPI,
): string {
  const items: string[] = []

  element.children('li').each((_, li) => {
    const liElement = $(li)
    const clonedItem = liElement.clone()
    clonedItem.children('ul,ol').remove()
    const inlineContent = sanitizeInlineContent(clonedItem, $)

    const nestedLists: string[] = []
    liElement.children('ul,ol').each((__, nested) => {
      const nestedTag = nested.name?.toLowerCase() || 'ul'
      const nestedListHtml = buildList($(nested), nestedTag, $)
      if (nestedListHtml) {
        nestedLists.push(nestedListHtml)
      }
    })

    const contentPieces = []
    if (inlineContent) {
      contentPieces.push(inlineContent)
    }
    if (nestedLists.length > 0) {
      contentPieces.push(nestedLists.join('\n'))
    }

    const content = contentPieces.join('\n').trim()
    if (content) {
      items.push(`<li>${content}</li>`)
    }
  })

  if (items.length === 0) {
    const fallbackText = cleanPlainText(element.text())
    if (!fallbackText) {
      return ''
    }
    return `<${listTag}><li>${escapeHtml(fallbackText)}</li></${listTag}>`
  }

  return `<${listTag}>\n${items.join('\n')}\n</${listTag}>`
}

function sanitizeInlineContent(element: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string {
  let result = ''

  element.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = normalizeInlineText(node.data || '')
      if (text.trim().length > 0) {
        result += escapeHtml(text)
      }
      return
    }

    if (node.type !== 'tag') {
      return
    }

    const tagName = node.name.toLowerCase()

    if (tagName === 'strong' || tagName === 'b') {
      const inner = sanitizeInlineContent($(node), $)
      if (inner) {
        result += `<strong>${inner}</strong>`
      }
      return
    }

    if (tagName === 'em' || tagName === 'i') {
      const inner = sanitizeInlineContent($(node), $)
      if (inner) {
        result += `<em>${inner}</em>`
      }
      return
    }

    if (tagName === 'a') {
      const href = sanitizeHref(($(node).attr('href') || '').trim())
      const inner = sanitizeInlineContent($(node), $)
      if (inner) {
        result += href ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner
      }
      return
    }

    if (tagName === 'br') {
      result += '<br />'
      return
    }

    const inner = sanitizeInlineContent($(node), $)
    if (inner) {
      result += inner
    }
  })

  return collapseWhitespace(result)
}

const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function parseUrl(value: string, base?: string): URL | null {
  try {
    return new URL(value, base)
  } catch {
    return null
  }
}

/**
 * Rewrites every href to an absolute http(s) or mailto: URL resolved against
 * the page URL, and drops any other (javascript:, tel:, data:, ...). Without a
 * usable page URL, relative hrefs are left for `sanitizeHref` as before.
 */
function resolveLinks($: cheerio.CheerioAPI, baseUrl?: string): void {
  const base = baseUrl ? parseUrl(baseUrl) : null
  if (!base || (base.protocol !== 'http:' && base.protocol !== 'https:')) {
    return
  }

  $('a[href]').each((_, el) => {
    const link = $(el)
    const href = (link.attr('href') || '').trim()
    const resolved = href ? parseUrl(href, base.href) : null
    if (resolved && ALLOWED_LINK_PROTOCOLS.has(resolved.protocol)) {
      link.attr('href', resolved.href)
    } else {
      link.removeAttr('href')
    }
  })
}

/**
 * Keeps absolute http(s)/mailto: links and relative ones; drops any other
 * scheme. The scheme is read the way a browser parses it, so " javascript:"
 * or "JaVaScRiPt:" can't slip through.
 */
function sanitizeHref(href: string): string {
  const trimmed = href.trim()
  if (!trimmed) {
    return ''
  }

  const absolute = parseUrl(trimmed)
  if (absolute && !ALLOWED_LINK_PROTOCOLS.has(absolute.protocol)) {
    return ''
  }

  return trimmed
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ')
}

function collapseWhitespace(html: string): string {
  return html.replace(/\s{2,}/g, ' ')
}

function normalizeHtml(html: string): string {
  return html
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+\s*\n+/g, '\n\n')
    .trim()
}

function cleanPlainText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

interface TruncationMetadata {
  text: string
  cutoff: number
  truncated: boolean
  appendEllipsis: boolean
}

function smartTruncateWithMetadata(text: string, maxLength: number): TruncationMetadata {
  if (text.length <= maxLength) {
    return {
      text,
      cutoff: text.length,
      truncated: false,
      appendEllipsis: false,
    }
  }

  const truncated = text.substring(0, maxLength)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  )

  if (lastSentenceEnd > maxLength * 0.8) {
    const finalText = text.substring(0, lastSentenceEnd + 1).trim()
    return {
      text: finalText,
      cutoff: finalText.length,
      truncated: true,
      appendEllipsis: false,
    }
  }

  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.9) {
    const finalText = text.substring(0, lastSpace).trim()
    return {
      text: `${finalText}...`,
      cutoff: finalText.length,
      truncated: true,
      appendEllipsis: true,
    }
  }

  const finalText = truncated.trim()
  return {
    text: `${finalText}...`,
    cutoff: finalText.length,
    truncated: true,
    appendEllipsis: true,
  }
}

/**
 * Cuts scraped content to `maxTextLength` characters of visible text, keeping
 * its markup (and links). Prompt budgets must count text, not markup: a
 * link-heavy page is 1.5-2x longer as HTML, and cutting the HTML string
 * dropped the testimonials, FAQ and pricing at the bottom of the page.
 * Plain text input works too. Content within the budget is returned as is.
 */
export function truncateContentByTextLength(content: string, maxTextLength: number): string {
  if (!content) {
    return ''
  }

  const plainText = cleanPlainText(cheerio.load(`<div>${content}</div>`).text())
  const truncation = smartTruncateWithMetadata(plainText, maxTextLength)
  if (!truncation.truncated) {
    return content
  }

  return normalizeHtml(
    truncateHtmlByTextLength(content, truncation.cutoff, truncation.appendEllipsis),
  )
}

function truncateHtmlByTextLength(html: string, cutoff: number, appendEllipsis: boolean): string {
  if (cutoff <= 0) {
    return appendEllipsis ? '...' : ''
  }

  const $ = cheerio.load(`<div data-root="true">${html}</div>`)
  const root = $('[data-root="true"]')
  let remaining = cutoff
  let truncated = false
  let ellipsisApplied = false

  function processNodes(nodes: cheerio.Cheerio<AnyNode>): string {
    let output = ''

    nodes.each((_, node) => {
      if (truncated || remaining <= 0) {
        return
      }

      if (node.type === 'text') {
        const data = node.data || ''
        if (data.trim().length === 0) {
          return
        }

        if (data.length <= remaining) {
          output += data
          remaining -= data.length
        } else {
          const visible = data.slice(0, remaining).trimEnd()
          if (visible.length > 0) {
            output += visible
          }
          remaining = 0
          truncated = true
          if (appendEllipsis && !ellipsisApplied) {
            output += '...'
            ellipsisApplied = true
          }
        }

        return
      }

      if (node.type !== 'tag') {
        return
      }

      const tagName = node.name.toLowerCase()

      if (!['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br'].includes(tagName)) {
        output += processNodes($(node).contents())
        return
      }

      if (tagName === 'br') {
        output += '<br />'
        return
      }

      const openTag = buildOpenTag($(node))
      output += openTag
      output += processNodes($(node).contents())

      if (!isSelfClosing(tagName)) {
        output += `</${tagName}>`
      }
    })

    return output
  }

  const truncatedHtml = processNodes(root.contents())
  if (appendEllipsis && !ellipsisApplied && truncated) {
    return `${truncatedHtml.trimEnd()}...`
  }

  return truncatedHtml
}

function buildOpenTag(element: cheerio.Cheerio<AnyNode>): string {
  const node = element.get(0)
  if (!node || node.type !== 'tag') {
    return ''
  }

  const tagName = node.name.toLowerCase()
  if (tagName === 'a') {
    const href = sanitizeHref(element.attr('href') || '')
    if (href) {
      return `<a href="${escapeHtml(href)}">`
    }
    return '<a>'
  }

  if (tagName === 'br') {
    return '<br />'
  }

  return `<${tagName}>`
}

function isSelfClosing(tag: string): boolean {
  return tag === 'br'
}

function countWords(text: string): number {
  if (!text) {
    return 0
  }

  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

/**
 * Check if content appears to be meaningful (not just navigation/ads)
 */
export function isContentMeaningful(content: string): boolean {
  const plainText = cleanPlainText(cheerio.load(`<div>${content}</div>`).text() || content)
  const wordCount = countWords(plainText)

  if (wordCount < 50) {
    return false
  }

  const contentIndicators = [
    /\b(article|post|content|text|paragraph|section)\b/i,
    /\b(about|description|details|information|overview)\b/i,
    /\b(how|what|why|when|where|who)\b/i,
  ]

  const hasContentIndicators = contentIndicators.some((pattern) => pattern.test(plainText))

  const navWords = (plainText.match(/\b(home|about|contact|menu|login|signup|search)\b/gi) || [])
    .length
  const navRatio = wordCount === 0 ? 0 : navWords / wordCount

  return hasContentIndicators && navRatio < 0.1
}
