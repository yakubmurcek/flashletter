'use client'

import { useEffect, useRef } from 'react'

export const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
  immediate = false,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  immediate?: boolean
}) => {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    if (immediate) {
      const id = requestAnimationFrame(() => {
        element.classList.add('is-visible')
      })
      return () => cancelAnimationFrame(id)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [immediate])

  return (
    <div
      ref={elementRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`fade-in-section ${className}`}
    >
      {children}
    </div>
  )
}

// Passthrough — still consumed by WaitlistForm. Kept as a no-op until the
// form itself is restyled to match the editorial direction.
export const PulseButton = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => <div className={className}>{children}</div>
