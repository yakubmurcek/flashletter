/**
 * Size caps for /api/chat. Cost scales with the prompt, so the server trims
 * every client-sent field instead of trusting the editor to send little.
 *
 * Sized from what the editor really sends (lib/hooks/use-ai-chat.ts): the
 * last 5 messages plus the new one, every email of the sequence (up to 30),
 * the scraped landing page (capped at 10k chars by the scraper) and the
 * current email again as `emailContext`. Emails are written at 120-200 words
 * (~1.2k chars), so even a heavily edited 30-email Pro sequence is ~200 KB.
 */

/** Hard reject above this (413). Trimming bounds cost; this just stops parsing junk. */
export const CHAT_MAX_BODY_BYTES = 512 * 1024

/** Conversation turns forwarded to the model; the editor sends at most 6. */
export const CHAT_HISTORY_LIMIT = 12
/** Per-message cap, in chars. */
export const CHAT_MESSAGE_LIMIT = 8_000

/** The email being edited (full content goes into the prompt). */
export const CHAT_EMAIL_CONTENT_LIMIT = 20_000
/** Text the user selected in the editor. */
export const CHAT_SELECTION_LIMIT = 4_000
/** Short fields: url, page title/description, subjects, previews, labels. */
export const CHAT_METADATA_LIMIT = 500
/** Emails listed as sequence context; matches the 30-day maximum. */
export const CHAT_MAX_LISTED_EMAILS = 30

/** Cuts `value` to `max` chars, marking the cut so the model knows text is missing. */
export function clip(value: string | undefined | null, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}… [truncated]` : value
}
