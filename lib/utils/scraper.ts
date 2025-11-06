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
 * Extract clean structured content from HTML with smart prioritization
 * @param html Raw HTML content
 * @returns Structured HTML content with word count
 */
export function extractTextFromHTML(html: string): ScrapedContent {
  const $ = cheerio.load(html)

  removeNoiseElements($)

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

  let mainElement: cheerio.Cheerio<any> | null = null
  let structuredHtml = ''

  for (const selector of contentSelectors) {
    const candidate = $(selector).first()
    if (candidate.length === 0) {
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
  const plainText = cleanPlainText(
    cheerio.load(`<div>${cleanedHtml}</div>`).text()
  )

  const truncation = smartTruncateWithMetadata(
    plainText,
    LANDING_PAGE_CONTENT_LIMIT
  )

  const truncatedHtml = truncation.truncated
    ? truncateHtmlByTextLength(
        cleanedHtml,
        truncation.cutoff,
        truncation.appendEllipsis
      )
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

  noiseSelectors.forEach((selector) => {
    $(selector).remove()
  })
}

function buildStructuredHtml(
  element: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): string {
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
  element: cheerio.Cheerio<any>,
  listTag: string,
  $: cheerio.CheerioAPI
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

function sanitizeInlineContent(
  element: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): string {
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

function sanitizeHref(href: string): string {
  if (!href) {
    return ''
  }

  const lowerHref = href.toLowerCase()
  if (lowerHref.startsWith('javascript:')) {
    return ''
  }

  return href
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

function smartTruncateWithMetadata(
  text: string,
  maxLength: number
): TruncationMetadata {
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
    truncated.lastIndexOf('?')
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

function truncateHtmlByTextLength(
  html: string,
  cutoff: number,
  appendEllipsis: boolean
): string {
  if (cutoff <= 0) {
    return appendEllipsis ? '...' : ''
  }

  const $ = cheerio.load(`<div data-root="true">${html}</div>`)
  const root = $('[data-root="true"]')
  let remaining = cutoff
  let truncated = false
  let ellipsisApplied = false

  function processNodes(nodes: cheerio.Cheerio<any>): string {
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

      if (
        ![
          'h1',
          'h2',
          'h3',
          'p',
          'ul',
          'ol',
          'li',
          'strong',
          'em',
          'a',
          'br',
        ].includes(tagName)
      ) {
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

function buildOpenTag(element: cheerio.Cheerio<any>): string {
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
  const plainText = cleanPlainText(
    cheerio.load(`<div>${content}</div>`).text() || content
  )
  const wordCount = countWords(plainText)

  if (wordCount < 50) {
    return false
  }

  const contentIndicators = [
    /\b(article|post|content|text|paragraph|section)\b/i,
    /\b(about|description|details|information|overview)\b/i,
    /\b(how|what|why|when|where|who)\b/i,
  ]

  const hasContentIndicators = contentIndicators.some((pattern) =>
    pattern.test(plainText)
  )

  const navWords = (
    plainText.match(/\b(home|about|contact|menu|login|signup|search)\b/gi) || []
  ).length
  const navRatio = wordCount === 0 ? 0 : navWords / wordCount

  return hasContentIndicators && navRatio < 0.1
}
