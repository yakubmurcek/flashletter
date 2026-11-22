import playbookData from '@/playbook/newsletter_playbook.json'

interface PlaybookItem {
  id: string
  label: string
  description: string
}

interface NewsletterPlaybook {
  tones: PlaybookItem[]
  purposes: PlaybookItem[]
}

const playbook = playbookData as NewsletterPlaybook

export const CAMPAIGN_STEPS = [
  { number: 1, label: 'Landing page' },
  { number: 2, label: 'Configuration' },
  { number: 3, label: 'Generate' },
]

export const CAMPAIGN_TONES = playbook.tones.map((t) => ({
  value: t.id,
  label: t.label,
}))

export const CAMPAIGN_TYPES = playbook.purposes.map((p) => ({
  value: p.id,
  label: p.label,
}))

export const CAMPAIGN_DURATION = {
  MIN: 3,
  MAX: 30,
  DEFAULT: 7,
}

// Smart defaults applied when an anonymous user pastes a URL on the landing
// page. Chosen so the user can land directly in the editor without picking a
// tone/type/length first — they can still tweak from the editor sidebar.
// Kept short (3) so first-paste users see the full sequence quickly.
export const SMART_DEFAULT_CAMPAIGN_CONFIG = {
  tone: 'friendly',
  campaignType: 'nurture',
  days: 5,
} as const
