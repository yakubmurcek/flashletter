import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { installLocalStoragePolyfill } from './_helpers/storage-polyfill'

installLocalStoragePolyfill()

const saveConsentMock = vi.fn()
let storedConsent: { analytics: boolean } | null = null
vi.mock('@/lib/analytics', () => ({
  saveConsent: (...args: unknown[]) => saveConsentMock(...args),
  readConsent: () => storedConsent,
}))

import { CookieConsentBanner } from '@/components/cookie-consent-banner'

beforeEach(() => {
  saveConsentMock.mockReset()
  storedConsent = null
})

afterEach(() => {
  cleanup()
})

describe('<CookieConsentBanner />', () => {
  it('asks a visitor who has not chosen yet, wherever they are', async () => {
    render(<CookieConsentBanner />)
    await screen.findByRole('button', { name: /accept/i })
    screen.getByRole('button', { name: /reject/i })
  })

  it('stays hidden once the visitor has chosen', () => {
    storedConsent = { analytics: false }
    render(<CookieConsentBanner />)
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
  })

  it('accepting stores analytics consent and hides the banner', async () => {
    render(<CookieConsentBanner />)
    fireEvent.click(await screen.findByRole('button', { name: /accept/i }))
    expect(saveConsentMock).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('button', { name: /accept/i })).toBeNull()
  })

  it('rejecting stores a refusal and hides the banner', async () => {
    render(<CookieConsentBanner />)
    fireEvent.click(await screen.findByRole('button', { name: /reject/i }))
    expect(saveConsentMock).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull()
  })

  it('never mentions marketing cookies the site does not set', async () => {
    render(<CookieConsentBanner />)
    await screen.findByRole('button', { name: /accept/i })
    expect(document.body.textContent).not.toMatch(/marketing/i)
  })
})
