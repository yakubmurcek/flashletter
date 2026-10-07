'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useRegionDetection } from '@/lib/utils/location-detection'

/**
 * Consent state for every signup surface (the /signup form and the anonymous
 * upgrade prompt). Outside the US the user must tick the box; trying to
 * continue without it nudges (callout + shake) instead of disabling buttons.
 */
export function useLegalConsent(enabled = true) {
  const [checked, setChecked] = useState(false)
  // Bumped each time someone tries to continue without ticking the box.
  const [nudge, setNudge] = useState(0)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const reduceMotion = useReducedMotion()
  const shake = useAnimationControls()
  const { locationInfo, isLoading } = useRegionDetection()

  const requiresCheckbox = enabled && !isLoading && locationInfo?.region === 'OTHER'
  const needsConfirmation = requiresCheckbox && !checked

  /** Returns true when the caller may proceed; otherwise nudges the user. */
  const ensureConsent = () => {
    if (!needsConfirmation) return true
    setNudge((n) => n + 1)
    checkboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    checkboxRef.current?.focus({ preventScroll: true })
    if (!reduceMotion) void shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } })
    return false
  }

  return {
    ensureConsent,
    reset: () => setChecked(false),
    consentProps: {
      showCheckbox: requiresCheckbox,
      checked,
      onCheckedChange: setChecked,
      nudged: nudge > 0 && !checked,
      checkboxRef,
      shake,
      reduceMotion: !!reduceMotion,
    },
  }
}

type LegalConsentProps = ReturnType<typeof useLegalConsent>['consentProps'] & {
  idPrefix?: string
}

const linkClass = 'font-medium text-primary hover:text-primary/80 transition-colors'

export function LegalConsent({
  showCheckbox,
  checked,
  onCheckedChange,
  nudged,
  checkboxRef,
  shake,
  reduceMotion,
  idPrefix = 'legal',
}: LegalConsentProps) {
  const checkboxId = `${idPrefix}-consent`
  const calloutId = `${idPrefix}-consent-callout`

  if (!showCheckbox) {
    return (
      <p className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link
          href="/terms"
          className={linkClass}
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          className={linkClass}
        >
          Privacy Policy
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {nudged && (
          <motion.div
            key="consent-callout"
            id={calloutId}
            role="alert"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-2 z-10 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-lg"
          >
            Please tick this box to continue.
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 bg-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={shake}
        className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
          nudged
            ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
            : 'border-border bg-muted/30'
        }`}
      >
        <input
          ref={checkboxRef}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          aria-describedby={nudged ? calloutId : undefined}
          className="mt-1 h-4 w-4 accent-primary border-border rounded"
        />
        <label
          htmlFor={checkboxId}
          className="text-xs leading-5 text-muted-foreground text-left"
        >
          I agree to the{' '}
          <Link
            href="/terms"
            className={linkClass}
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className={linkClass}
          >
            Privacy Policy
          </Link>{' '}
          and consent to the processing of my personal data in accordance with GDPR.
        </label>
      </motion.div>
    </div>
  )
}
