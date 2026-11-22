import type { PlanId } from './plans'

export type LimitKind = 'campaigns' | 'emails' | 'ai_rewrites'

/** Thrown client-side when an API answers 402: the user's plan limit was hit. */
export class PlanLimitError extends Error {
  constructor(
    message: string,
    public plan: PlanId,
    public limit: LimitKind = 'campaigns',
  ) {
    super(message)
    this.name = 'PlanLimitError'
  }
}

export function planLimitFromResponse(status: number, raw: unknown): PlanLimitError | null {
  if (status !== 402 || !raw || typeof raw !== 'object') return null
  const body = raw as { message?: unknown; plan?: unknown; limit?: unknown }
  const plan = body.plan === 'guest' || body.plan === 'pro' ? body.plan : 'free'
  const limit = body.limit === 'emails' || body.limit === 'ai_rewrites' ? body.limit : 'campaigns'
  return new PlanLimitError(
    typeof body.message === 'string' ? body.message : 'You have reached your plan limit.',
    plan,
    limit,
  )
}
