'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

interface RevealProps {
  children: ReactNode
  className?: string
  /** Seconds before this element starts animating once in view. */
  delay?: number
  /** Distance in px the element rises from. */
  y?: number
  as?: 'div' | 'li' | 'section'
}

/**
 * Fades and lifts its children in the first time they scroll into view.
 * Users with "reduce motion" get a plain fade.
 */
export function Reveal({ children, className, delay = 0, y = 24, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Component>
  )
}

const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
}

/**
 * Container whose RevealItem children appear one after another when it
 * scrolls into view.
 */
export function RevealGroup({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'dl' | 'ul'
}) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Component>
  )
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const Component = motion[as]
  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  }
  return (
    <Component
      className={className}
      variants={variants}
    >
      {children}
    </Component>
  )
}
