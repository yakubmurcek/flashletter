/**
 * AI Chat Assistant Prompts
 *
 * This file contains all the prompt templates for the AI chat assistant.
 * Organized by section for easy editing and maintenance.
 *
 * Large prompts moved to prompt-templates.ts to reduce webpack cache warnings
 */

import { LARGE_SYSTEM_PROMPTS } from './prompt-templates'

// ============================================================================
// SELECTED TEXT PROMPTS
// ============================================================================

export const SELECTED_TEXT_DISCUSS = `
IMPORTANT: The user wants to DISCUSS this text with you. DO NOT 
automatically edit - wait for their specific question or command. Just 
acknowledge the selection and ask how you can help with this specific 
part.`

export const SELECTED_TEXT_EDIT_COMMAND = `
IMPORTANT: This is a DIRECT COMMAND to edit. You MUST:
1. Set shouldEdit: true
2. Find the selected text within the FULL email content
3. Replace ONLY that specific part with your improvement
4. Return the COMPLETE, ENTIRE email content (not just the changed 
   snippet!)
5. Explain what you changed in the message field

⚠️ CRITICAL: NEVER return just the edited snippet. ALWAYS return the 
FULL email with the change applied. If you only return the snippet, you 
will DELETE the rest of the user's email!`

export const SELECTED_TEXT_CONTEXT_NOTE = `
While you should focus on this specific text selection, keep in mind 
the full email context below. Your response should address the 
selected text but maintain coherence with the entire email.`

// ============================================================================
// CAMPAIGN CONTEXT PROMPTS
// ============================================================================

export const CONTEXT_USAGE_GUIDELINES = `
🎨 HOW TO USE THIS CONTEXT:
1. Reference the landing page content for accurate product/service 
   details
2. Maintain brand voice and messaging consistency across all emails
3. Ensure current email fits within the campaign sequence narrative
4. Check that CTAs align with the product/service offering
5. Verify tone matches the campaign configuration
6. Look for opportunities to create coherent storytelling across days
7. Use landing page metadata for accurate product names, features, 
   benefits

IMPORTANT: When making suggestions or edits, consider:
- Does this align with what's on the landing page?
- Is this consistent with previous emails in the sequence?
- Does this fit the overall campaign narrative?
- Is the tone appropriate for the campaign type?`

// ============================================================================
// SYSTEM ROLE & BEHAVIOR
// ============================================================================

export const SYSTEM_ROLE = LARGE_SYSTEM_PROMPTS.SYSTEM_ROLE

export const RESPONSE_STYLE = LARGE_SYSTEM_PROMPTS.RESPONSE_STYLE

export const FORMATTING_GUIDELINES = LARGE_SYSTEM_PROMPTS.FORMATTING_GUIDELINES

// ============================================================================
// EDIT DECISION LOGIC
// ============================================================================

export const EDIT_DECISION_TREE = LARGE_SYSTEM_PROMPTS.EDIT_DECISION_TREE

export const EDIT_COMMANDS_EXAMPLES =
  LARGE_SYSTEM_PROMPTS.EDIT_COMMANDS_EXAMPLES

export const NO_EDIT_EXAMPLES = LARGE_SYSTEM_PROMPTS.NO_EDIT_EXAMPLES

export const EDIT_KEY_DISTINCTION = LARGE_SYSTEM_PROMPTS.EDIT_KEY_DISTINCTION

export const OPTION_SELECTION_HANDLING =
  LARGE_SYSTEM_PROMPTS.OPTION_SELECTION_HANDLING

// ============================================================================
// JSON RESPONSE FORMAT
// ============================================================================

export const JSON_FORMAT_INSTRUCTIONS =
  LARGE_SYSTEM_PROMPTS.JSON_FORMAT_INSTRUCTIONS

export const DATA_LOSS_PREVENTION = LARGE_SYSTEM_PROMPTS.DATA_LOSS_PREVENTION

export const ADVICE_ONLY_FORMAT = LARGE_SYSTEM_PROMPTS.ADVICE_ONLY_FORMAT
