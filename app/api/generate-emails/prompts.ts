/**
 * Email Generation Prompts
 *
 * Large prompt templates moved here to reduce webpack cache warnings
 */

export function getCampaignStructure(type: string, days: number): string {
  const structures: Record<string, string> = {
    nurture: `
Day 1: Welcome & Introduction
Days 2-${Math.floor(days / 2)}: Value-building content, educational resources
Days ${Math.floor(days / 2) + 1}-${days - 1}: Social proof, success stories
Day ${days}: Strong call-to-action`,

    onboarding: `
Day 1: Warm welcome, set expectations
Days 2-${Math.floor(days / 3)}: Getting started guide, basic features
Days ${Math.floor(days / 3) + 1}-${Math.floor(
      (2 * days) / 3
    )}: Advanced features, pro tips
Days ${
      Math.floor((2 * days) / 3) + 1
    }-${days}: Completion celebration, next steps`,

    promotional: `
Day 1: Introduce offer, create awareness
Days 2-${Math.floor(days / 2)}: Build urgency, showcase benefits
Days ${Math.floor(days / 2) + 1}-${days - 1}: Overcome objections, testimonials
Day ${days}: Final push, last chance messaging`,
  }

  return structures[type] || structures.nurture
}

export function getToneGuidelines(tone: string): string {
  const tones: Record<string, string> = {
    professional:
      'Formal language, clear and direct, industry expertise, authoritative',
    friendly:
      'Conversational, warm, approachable, use "you" and "we", casual but respectful',
    enthusiastic:
      'Energetic, exciting, use exclamation points (moderately), positive language',
    casual: 'Relaxed, informal, conversational, relatable, down-to-earth',
  }

  return tones[tone] || tones.friendly
}

export function buildInstructions(
  config: { days: number; campaignType: string; tone: string },
  landingUrl: string,
  landingContent?: string
): string {
  return `You are an expert email marketing copywriter. Generate a ${
    config.days
  }-day ${config.campaignType} email campaign with a ${config.tone} tone.

Landing Page URL: ${landingUrl}
${
  landingContent
    ? `Landing Page Content:\n${landingContent.substring(0, 2000)}`
    : ''
}

For each email, provide:
1. A compelling subject line (under 60 characters)
2. Preview text (under 100 characters)
3. Email body content in Markdown format

Email campaign structure for ${config.campaignType}:
${getCampaignStructure(config.campaignType, config.days)}

Tone guidelines for ${config.tone}:
${getToneGuidelines(config.tone)}

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "emails": [
    {
      "day": 1,
      "subject": "...",
      "preview": "...",
      "content": "..."
    }
  ]
}

Make sure the content is engaging, actionable, and aligned with best email marketing practices.`
}
