import {
  CAMPAIGN_CONTEXT_LANDING_PAGE_LIMIT,
  EMAIL_CONTENT_PREVIEW_LIMIT,
} from '@/lib/constants/app'
import type { CampaignContext, EmailContext, SelectedContext } from './schemas'
import * as prompts from './prompts'

// ============================================================================
// SELECTED TEXT CONTEXT
// ============================================================================

export function buildSelectedTextContext(
  selectedContext: SelectedContext | null | undefined,
): string {
  if (!selectedContext) return ''

  const isDiscussOnly = selectedContext.action === 'Ask AI about this'
  const instruction = isDiscussOnly
    ? prompts.SELECTED_TEXT_DISCUSS
    : prompts.SELECTED_TEXT_EDIT_COMMAND

  return `

🎯 SELECTED TEXT FOCUS:
The user has specifically selected this text to focus on: "${selectedContext.text}"
Requested action: ${selectedContext.action}

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

function formatEmailsList(allEmails: CampaignContext['allEmails'], currentEmailId: number): string {
  return allEmails
    .map((email) => {
      const isCurrent = email.id === currentEmailId
      const contentPreview =
        email.content.length > EMAIL_CONTENT_PREVIEW_LIMIT
          ? `${email.content.substring(0, EMAIL_CONTENT_PREVIEW_LIMIT)}...`
          : email.content

      return `
Email ${email.day}${isCurrent ? ' ⬅️ CURRENT EMAIL' : ''}:
Subject: ${email.subject}
Preview: ${email.preview}
Content (first ${EMAIL_CONTENT_PREVIEW_LIMIT} chars): ${contentPreview}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    })
    .join('\n')
}

export function buildCampaignContextSection(campaignContext: CampaignContext | undefined): string {
  if (!campaignContext) return ''

  const { landingPageData, config, allEmails, currentEmailId } = campaignContext
  const currentEmail = allEmails.find((e) => e.id === currentEmailId)

  return `

CAMPAIGN CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRODUCT/LANDING PAGE INFORMATION:
URL: ${landingPageData.url}
${landingPageData.metadata?.title ? `Title: ${landingPageData.metadata.title}` : ''}
${
  landingPageData.metadata?.description
    ? `Description: ${landingPageData.metadata.description}`
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
- Subject: ${currentEmail?.subject}
- Content:
${currentEmail?.content}

`
}

// ============================================================================
// LEGACY EMAIL CONTEXT
// ============================================================================

export function buildLegacyEmailContext(
  campaignContext: CampaignContext | undefined,
  emailContext: EmailContext | undefined,
): string {
  if (campaignContext || !emailContext) return ''

  return `

CURRENT EMAIL CONTEXT:
- Subject: ${emailContext.subject}
- Campaign Type: ${emailContext.campaignType}
- Content:
${emailContext.content}`
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
