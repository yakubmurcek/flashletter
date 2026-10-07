import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

const signInWithOAuthMock = vi.fn()
const signUpMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      signInWithPassword: vi.fn(),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

let region: 'US' | 'OTHER' = 'OTHER'
vi.mock('@/lib/utils/location-detection', () => ({
  useRegionDetection: () => ({
    locationInfo: { region, requiresGDPR: region === 'OTHER' },
    isLoading: false,
  }),
}))

import { AuthForm } from '@/components/auth/auth-form'

beforeEach(() => {
  region = 'OTHER'
  signInWithOAuthMock.mockReset()
  signUpMock.mockReset()
  signInWithOAuthMock.mockResolvedValue({ data: { url: null }, error: null })
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('<AuthForm mode="signup" /> consent', () => {
  it('keeps Google and Create Account clickable before consent', () => {
    render(<AuthForm mode="signup" />)
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /continue with google/i }).disabled,
    ).toBe(false)
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: /create account/i }).disabled,
    ).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the callout instead of signing in when Google is clicked without consent', () => {
    render(<AuthForm mode="signup" />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(screen.getByRole('alert').textContent).toMatch(/tick this box/i)
    expect(signInWithOAuthMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('checkbox'))
  })

  it('shows the callout instead of signing up when the form is submitted without consent', () => {
    render(<AuthForm mode="signup" />)
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    screen.getByRole('alert')
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('hides the callout once the box is ticked and then signs in with Google', async () => {
    render(<AuthForm mode="signup" />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1))
  })

  it('signs in with Google directly where no checkbox is required', async () => {
    region = 'US'
    render(<AuthForm mode="signup" />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    await waitFor(() => expect(signInWithOAuthMock).toHaveBeenCalledTimes(1))
  })
})
