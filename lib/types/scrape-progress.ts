export interface ProgressStage {
  id: string
  messageTemplate: string
  minDuration: number
  icon?: 'check' | 'loader' | 'brain' | 'search' | 'chart' | 'sparkles'
}

export interface ProgressState {
  currentStageId: string
  completedStageIds: string[]
  dynamicContext: {
    domain?: string
    title?: string
    siteName?: string
  }
}

export const SCRAPE_PROGRESS_STAGES: ProgressStage[] = [
  {
    id: 'connecting',
    messageTemplate: 'Connecting to {domain}...',
    minDuration: 600,
    icon: 'search',
  },
  {
    id: 'fetching',
    messageTemplate: 'Fetching live page content...',
    minDuration: 800,
    icon: 'loader',
  },
  {
    id: 'analyzing',
    messageTemplate: 'Analyzing "{title}"...',
    minDuration: 1200,
    icon: 'brain',
  },
  {
    id: 'understanding',
    messageTemplate: 'Understanding offer & target audience...',
    minDuration: 1000,
    icon: 'sparkles',
  },
  {
    id: 'scoring',
    messageTemplate: 'Scoring clarity, trust & conversion...',
    minDuration: 800,
    icon: 'chart',
  },
  {
    id: 'finding',
    messageTemplate: 'Identifying strengths & opportunities...',
    minDuration: 800,
    icon: 'search',
  },
  {
    id: 'generating',
    messageTemplate: 'Preparing campaign insights...',
    minDuration: 800,
    icon: 'sparkles',
  },
]

export function getCleanDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return 'page'
  }
}

export function formatProgressMessage(
  template: string,
  context: ProgressState['dynamicContext'],
): string {
  let message = template

  // Replace tokens with context or fallback values
  message = message.replace('{domain}', context.domain || 'page')

  if (message.includes('{title}')) {
    if (context.title) {
      message = message.replace('{title}', context.title)
    } else if (context.siteName) {
      message = message.replace('{title}', context.siteName)
    } else {
      message = message.replace('{title}', 'page content') // specific fallback for title
    }
  }

  return message
}
