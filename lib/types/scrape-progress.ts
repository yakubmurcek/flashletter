import type { ScrapeLandingResponse } from '../schemas/api'

export type ProgressStageId =
  | 'connecting'
  | 'fetching'
  | 'extracting'
  | 'analyzing'
  | 'synthesizing'
  | 'completed'

/**
 * Wire format for NDJSON events sent from /api/scrape-landing/stream.
 * Each line of the response body parses into one of these objects.
 */
export type ScrapeStreamEvent =
  | {
      type: 'stage'
      stageId: Exclude<ProgressStageId, 'completed'>
      context?: {
        title?: string
        siteName?: string
        domain?: string
        cached?: boolean
      }
    }
  | { type: 'complete'; data: ScrapeLandingResponse }
  | { type: 'error'; message: string }

export interface ProgressStage {
  id: ProgressStageId
  messageTemplate: string
  icon?: 'check' | 'loader' | 'brain' | 'search' | 'chart' | 'sparkles'
}

export interface ProgressState {
  currentStageId: ProgressStageId
  completedStageIds: ProgressStageId[]
  dynamicContext: {
    domain?: string
    title?: string
    siteName?: string
    cached?: boolean
  }
}

/**
 * Real stages matching events emitted by POST /api/scrape-landing/stream.
 * Each stage corresponds to actual work on the server — no simulated timers.
 */
export const SCRAPE_PROGRESS_STAGES: [ProgressStage, ...ProgressStage[]] = [
  {
    id: 'connecting',
    messageTemplate: 'Connecting to {domain}…',
    icon: 'search',
  },
  {
    id: 'fetching',
    messageTemplate: 'Fetching landing page…',
    icon: 'loader',
  },
  {
    id: 'extracting',
    messageTemplate: 'Reading "{title}"…',
    icon: 'search',
  },
  {
    id: 'analyzing',
    messageTemplate: 'Analyzing offer, audience & proof…',
    icon: 'brain',
  },
  {
    id: 'synthesizing',
    messageTemplate: 'Building campaign insights…',
    icon: 'sparkles',
  },
]

export function getCleanDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'page'
  }
}

export function formatProgressMessage(
  template: string,
  context: ProgressState['dynamicContext'],
): string {
  let message = template
  message = message.replace('{domain}', context.domain || 'page')

  if (message.includes('{title}')) {
    const name = context.title || context.siteName
    if (name) {
      const short = name.length > 48 ? `${name.slice(0, 47).trimEnd()}…` : name
      message = message.replace('{title}', short)
    } else {
      // Before the page is fetched there is no title yet.
      message = 'Reading the page…'
    }
  }

  return message
}
