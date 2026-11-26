import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

let serverUser: { id: string; is_anonymous: boolean } | null = null
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: serverUser } }) } }),
}))
vi.mock('@/components/auth/auth-form', () => ({ AuthForm: () => null }))
const upgradePromptProps = vi.fn()
vi.mock('@/components/auth/upgrade-prompt', () => ({
  UpgradePrompt: (props: Record<string, unknown>) => {
    upgradePromptProps(props)
    return null
  },
}))

import SignupPage from '@/app/(auth)/signup/page'
import LoginPage from '@/app/(auth)/login/page'
import { at } from './_helpers/at'

const params = (p: Record<string, string>) => Promise.resolve(p)

beforeEach(() => {
  serverUser = null
  upgradePromptProps.mockReset()
})

// UpgradeButton sends a logged-out visitor to /signup?redirectTo=/account?upgrade=…
// so checkout resumes after auth. An existing customer then clicks "Sign in".
describe('auth page cross-links keep redirectTo', () => {
  it('signup → sign in keeps the checkout to resume', async () => {
    const { getByRole } = render(
      await SignupPage({ searchParams: params({ redirectTo: '/account?upgrade=month' }) }),
    )
    expect(getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
      '/login?redirectTo=%2Faccount%3Fupgrade%3Dmonth',
    )
  })

  it('login → sign up keeps where the visitor was going', async () => {
    const { getByRole } = render(
      await LoginPage({ searchParams: params({ redirectTo: '/account' }) }),
    )
    expect(getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe(
      '/signup?redirectTo=%2Faccount',
    )
  })

  it('plain links when there is nowhere special to return to', async () => {
    const { getByRole } = render(await LoginPage({ searchParams: params({}) }))
    expect(getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup')
  })

  it('drops an off-site redirectTo', async () => {
    const { getByRole } = render(
      await SignupPage({ searchParams: params({ redirectTo: '/\\evil.example' }) }),
    )
    expect(getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
  })
})

// /auth/callback appends ?authError=… and /account forwards it to /signup for
// a guest. The guest view must receive it, or a failed Google link loops silently.
describe('guest /signup passes the callback error through', () => {
  it('hands authError to UpgradePrompt', async () => {
    serverUser = { id: 'anon', is_anonymous: true }
    render(
      await SignupPage({
        searchParams: params({
          redirectTo: '/account?upgrade=month',
          authError: 'Identity is already linked to another user',
        }),
      }),
    )
    expect(upgradePromptProps).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectTo: '/account?upgrade=month',
        initialError: 'Identity is already linked to another user',
      }),
    )
  })

  it('passes no error when there is none', async () => {
    serverUser = { id: 'anon', is_anonymous: true }
    render(await SignupPage({ searchParams: params({}) }))
    expect(at(upgradePromptProps.mock.calls, 0)[0].initialError ?? null).toBeNull()
  })
})
