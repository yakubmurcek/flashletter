import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { GeneratingState } from '@/components/editor/generating-state'

afterEach(() => cleanup())

describe('<GeneratingState />', () => {
  it('shows a progress bar and a working hint while Day 1 is written', () => {
    render(
      <GeneratingState
        streamedCount={0}
        totalExpected={5}
        error={null}
      />,
    )
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(screen.getByText(/picking the angle for day 1/i)).toBeTruthy()
    expect(screen.getByText('0 of 5 emails')).toBeTruthy()
  })

  // Bug: "Generation failed" was a dead end with no way to start again.
  it('offers Try again when generation failed', () => {
    const onRetry = vi.fn()
    render(
      <GeneratingState
        streamedCount={0}
        totalExpected={5}
        error="The AI service is busy right now."
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText('The AI service is busy right now.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not offer Try again for a plan limit', () => {
    render(
      <GeneratingState
        streamedCount={0}
        totalExpected={5}
        error="You have used this month's campaigns."
        limitPlan="free"
        onRetry={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })
})
