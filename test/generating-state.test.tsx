import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
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
})
