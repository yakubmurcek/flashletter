import { useEffect, useRef } from 'react'

// Animated components - simple CSS-based approach
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
      // Trigger visibility on next frame so CSS transitions run
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
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
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

export const FloatingElement = ({
  children,
  delay = 0,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  variant?: 'default' | 'gentle' | 'bouncy' | 'sway'
  className?: string
}) => {
  const animationClass = {
    default: 'animate-float',
    gentle: 'animate-float-gentle',
    bouncy: 'animate-float-bouncy',
    sway: 'animate-float-sway',
  }[variant]

  const combinedClassName = className
    ? `${animationClass} ${className}`
    : animationClass

  return (
    <div
      className={combinedClassName}
      style={{
        animationDelay: `${delay}s, ${delay + 0.3}s`,
      }}
    >
      {children}
    </div>
  )
}

export const PulseButton = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute -inset-0.5 bg-primary/20 rounded-full blur-sm"
        style={{
          animation: 'pulseButton 3s ease-in-out infinite',
        }}
      ></div>
      <div
        className="relative"
        style={{
          animation: 'scaleButton 4s ease-in-out infinite',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export const GradientText = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span
    className={`bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 bg-clip-text text-transparent animate-gradient ${className}`}
  >
    {children}
  </span>
)
