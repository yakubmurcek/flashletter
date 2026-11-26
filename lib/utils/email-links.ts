/**
 * Makes every Markdown link in an email safe to paste into an email tool.
 *
 * An email has no "current page", so a relative link (`/register`, `#pricing`,
 * `cenik`) is dead once the email leaves the editor, and a `javascript:` link
 * is unsafe. Links that are already absolute `http(s):` or `mailto:` are kept
 * byte for byte; relative ones are resolved against the landing URL; anything
 * else points at the landing URL instead. Images are only resolved, never
 * swapped for the landing page (that would just make a broken image).
 *
 * Without a usable landing URL, links that can't be fixed are unwrapped to
 * their text. Never throws, and running it twice changes nothing.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

interface ParsedLink {
  /** Index just past the closing `)`. */
  end: number
  /** The link text (or image alt) between the brackets. */
  text: string
  /** The raw destination, without `<>` wrapping. */
  destination: string
  /** The raw title part including its leading whitespace, or ''. */
  title: string
}

export function fixEmailLinks(markdown: string, landingUrl?: string): string {
  if (!markdown || !markdown.includes('](')) return markdown

  const base = parseBase(landingUrl)
  let out = ''
  let i = 0

  while (i < markdown.length) {
    const ch = markdown[i]

    if (ch === '\\') {
      out += markdown.slice(i, i + 2)
      i += 2
      continue
    }

    if (ch === '[') {
      const isImage = i > 0 && markdown[i - 1] === '!' && markdown[i - 2] !== '\\'
      const link = parseLinkAt(markdown, i)
      if (link) {
        const fixed = rewriteLink(link, markdown.slice(i, link.end), isImage, base)
        // An unwrapped image leaves only its alt text: drop the `!` already copied.
        if (fixed.unwrapped && isImage) out = out.slice(0, -1)
        out += fixed.text
        i = link.end
        continue
      }
    }

    out += ch
    i++
  }

  return out
}

function rewriteLink(
  link: ParsedLink,
  raw: string,
  isImage: boolean,
  base: URL | null,
): { text: string; unwrapped: boolean } {
  const target = classify(link.destination, base)
  const relink = (href: string) => ({
    text: `[${link.text}](${formatDestination(href)}${link.title})`,
    unwrapped: false,
  })

  if (target.kind === 'keep') return { text: raw, unwrapped: false }
  if (target.kind === 'resolved') return relink(target.href)
  // Unsafe or unresolvable.
  if (isImage || !base) return { text: link.text, unwrapped: true }
  return relink(base.href)
}

type Target = { kind: 'keep' } | { kind: 'resolved'; href: string } | { kind: 'bad' }

function classify(destination: string, base: URL | null): Target {
  const absolute = tryUrl(destination)
  if (absolute) {
    // A scheme-relative-looking string never parses without a base, so this
    // branch only sees real absolute URLs.
    return ALLOWED_PROTOCOLS.has(absolute.protocol) ? { kind: 'keep' } : { kind: 'bad' }
  }

  if (!base || destination.trim() === '') return { kind: 'bad' }

  const resolved = tryUrl(destination, base)
  if (!resolved || !ALLOWED_PROTOCOLS.has(resolved.protocol)) return { kind: 'bad' }
  return { kind: 'resolved', href: resolved.href }
}

function parseBase(landingUrl: string | undefined): URL | null {
  if (!landingUrl) return null
  const url = tryUrl(landingUrl.trim())
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null
  return url
}

function tryUrl(value: string, base?: URL): URL | null {
  try {
    return new URL(value, base)
  } catch {
    return null
  }
}

/** Parenthesis-safe destination for a resolved URL. */
function formatDestination(href: string): string {
  return hasBalancedParens(href) ? href : href.replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function hasBalancedParens(value: string): boolean {
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')' && --depth < 0) return false
  }
  return depth === 0
}

/**
 * Parses an inline link `[text](destination "title")` whose `[` is at `start`.
 * Returns null when the text there is not an inline link.
 */
function parseLinkAt(src: string, start: number): ParsedLink | null {
  // Matching `]`, allowing nested brackets and escapes in the text.
  let depth = 0
  let i = start
  for (; i < src.length; i++) {
    const ch = src[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (ch === '\n' && src[i + 1] === '\n') return null
    if (ch === '[') depth++
    else if (ch === ']' && --depth === 0) break
  }
  if (i >= src.length || src[i + 1] !== '(') return null

  const text = src.slice(start + 1, i)
  let j = i + 2
  while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++

  let destination = ''
  if (src[j] === '<') {
    const close = src.indexOf('>', j + 1)
    if (close === -1) return null
    destination = src.slice(j + 1, close)
    if (destination.includes('\n') || destination.includes('<')) return null
    j = close + 1
  } else {
    const destStart = j
    let parens = 0
    for (; j < src.length; j++) {
      const ch = src[j] ?? ''
      if (ch === '\\') {
        j++
        continue
      }
      if (/\s/.test(ch)) break
      if (ch === '(') parens++
      else if (ch === ')') {
        if (parens === 0) break
        parens--
      }
    }
    if (parens !== 0) return null
    destination = src.slice(destStart, j)
  }

  // Optional title: "..." '...' or (...), separated by whitespace.
  const titleStart = j
  while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++
  const opener = src[j]
  if (j > titleStart && (opener === '"' || opener === "'" || opener === '(')) {
    const closer = opener === '(' ? ')' : opener
    let k = j + 1
    for (; k < src.length; k++) {
      if (src[k] === '\\') {
        k++
        continue
      }
      if (src[k] === closer) break
    }
    if (k >= src.length) return null
    j = k + 1
    while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++
  }
  const title = src.slice(titleStart, j).replace(/\s+$/, '')

  if (src[j] !== ')') return null
  return { end: j + 1, text, destination, title }
}
