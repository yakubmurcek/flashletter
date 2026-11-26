import {
  CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT,
  EMAIL_CONTENT_PREVIEW_LIMIT,
} from '@/lib/constants/app'
import type { CampaignContext, EmailContext, SelectedContext } from './schemas'
import {
  CHAT_EMAIL_CONTENT_LIMIT,
  CHAT_MAX_LISTED_EMAILS,
  CHAT_METADATA_LIMIT,
  CHAT_SELECTION_LIMIT,
  clip,
} from './limits'
import * as prompts from './prompts'

// ============================================================================
// SELECTED TEXT CONTEXT
// ============================================================================

function buildSelectedTextContext(selectedContext: SelectedContext | null | undefined): string {
  if (!selectedContext) return ''

  const isDiscussOnly = selectedContext.action === 'Ask AI about this'
  const instruction = isDiscussOnly
    ? prompts.SELECTED_TEXT_DISCUSS
    : prompts.SELECTED_TEXT_EDIT_COMMAND

  return `

🎯 SELECTED TEXT FOCUS:
The user has specifically selected this text to focus on: "${clip(selectedContext.text, CHAT_SELECTION_LIMIT)}"
Requested action: ${clip(selectedContext.action, CHAT_METADATA_LIMIT)}

${instruction}

${prompts.SELECTED_TEXT_CONTEXT_NOTE}`
}

// ============================================================================
// CAMPAIGN CONTEXT
// ============================================================================

function formatLandingPageContent(content: string | undefined): string {
  if (!content) return 'Not available'

  if (content.length > CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT) {
    return `${content.substring(0, CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT)}...`
  }

  return content
}

// Each listed email adds a fixed template block, so thousands of tiny emails
// would still blow up the prompt. List at most a full-length sequence, and
// always include the current email.
function listedEmails(
  allEmails: CampaignContext['allEmails'],
  currentEmailId: number,
): CampaignContext['allEmails'] {
  const listed = allEmails.slice(0, CHAT_MAX_LISTED_EMAILS)
  if (!listed.some((e) => e.id === currentEmailId)) {
    const current = allEmails.find((e) => e.id === currentEmailId)
    if (current) listed.push(current)
  }
  return listed
}

function formatEmailsList(allEmails: CampaignContext['allEmails'], currentEmailId: number): string {
  return listedEmails(allEmails, currentEmailId)
    .map((email) => {
      const isCurrent = email.id === currentEmailId
      const contentPreview =
        email.content.length > EMAIL_CONTENT_PREVIEW_LIMIT
          ? `${email.content.substring(0, EMAIL_CONTENT_PREVIEW_LIMIT)}...`
          : email.content

      return `
Email ${email.day}${isCurrent ? ' ⬅️ CURRENT EMAIL' : ''}:
Subject: ${clip(email.subject, CHAT_METADATA_LIMIT)}
Preview: ${clip(email.preview, CHAT_METADATA_LIMIT)}
Content (first ${EMAIL_CONTENT_PREVIEW_LIMIT} chars): ${contentPreview}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    })
    .join('\n')
}

function buildCampaignContextSection(campaignContext: CampaignContext | undefined): string {
  if (!campaignContext) return ''

  const { landingPageData, config, allEmails, currentEmailId } = campaignContext
  const currentEmail = allEmails.find((e) => e.id === currentEmailId)

  return `

CAMPAIGN CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRODUCT/LANDING PAGE INFORMATION:
URL: ${clip(landingPageData.url, CHAT_METADATA_LIMIT)}
${landingPageData.metadata?.title ? `Title: ${clip(landingPageData.metadata.title, CHAT_METADATA_LIMIT)}` : ''}
${
  landingPageData.metadata?.description
    ? `Description: ${clip(landingPageData.metadata.description, CHAT_METADATA_LIMIT)}`
    : ''
}

Landing Page Content (first ${CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT} chars):
${formatLandingPageContent(landingPageData.content)}

📋 CAMPAIGN CONFIGURATION:
- Type: ${config.campaignType}
- Tone: ${config.tone}
- Duration: ${config.days} days

📧 ALL EMAILS IN THIS CAMPAIGN SEQUENCE:
${formatEmailsList(allEmails, currentEmailId)}

${prompts.CONTEXT_USAGE_GUIDELINES}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT EMAIL BEING EDITED:
- Day: ${currentEmailId}
- Subject: ${clip(currentEmail?.subject, CHAT_METADATA_LIMIT)}
- Content:
${clip(currentEmail?.content, CHAT_EMAIL_CONTENT_LIMIT)}

`
}

// ============================================================================
// LEGACY EMAIL CONTEXT
// ============================================================================

function buildLegacyEmailContext(
  campaignContext: CampaignContext | undefined,
  emailContext: EmailContext | undefined,
): string {
  if (campaignContext || !emailContext) return ''

  return `

CURRENT EMAIL CONTEXT:
- Subject: ${clip(emailContext.subject, CHAT_METADATA_LIMIT)}
- Campaign Type: ${clip(emailContext.campaignType, CHAT_METADATA_LIMIT)}
- Content:
${clip(emailContext.content, CHAT_EMAIL_CONTENT_LIMIT)}`
}

// ============================================================================
// MAIN SYSTEM INSTRUCTIONS
// ============================================================================

export function buildSystemInstructions(
  campaignContext: CampaignContext | undefined,
  emailContext: EmailContext | undefined,
  selectedContext: SelectedContext | null | undefined,
): string {
  const contextSections = [
    buildCampaignContextSection(campaignContext),
    buildLegacyEmailContext(campaignContext, emailContext),
    buildSelectedTextContext(selectedContext),
  ]
    .filter(Boolean)
    .join('')

  return [
    prompts.SYSTEM_ROLE,
    contextSections,
    prompts.RESPONSE_STYLE,
    prompts.FORMATTING_GUIDELINES,
    prompts.EDIT_DECISION_TREE,
    prompts.EDIT_COMMANDS_EXAMPLES,
    prompts.NO_EDIT_EXAMPLES,
    prompts.EDIT_KEY_DISTINCTION,
    prompts.OPTION_SELECTION_HANDLING,
    prompts.JSON_FORMAT_INSTRUCTIONS,
    prompts.DATA_LOSS_PREVENTION,
    prompts.ADVICE_ONLY_FORMAT,
  ].join('\n\n')
}
