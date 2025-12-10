'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface InteractiveClockProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function InteractiveClock({ className = '', size = 'md' }: InteractiveClockProps) {
  const [time, setTime] = useState(new Date())
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main clock container */}
      <div
        className={`
          ${sizeClasses[size]} 
          bg-gradient-to-br from-primary/20 to-amber-300/20 
          rounded-full 
          flex items-center justify-center
          border-2 border-primary/30
          shadow-lg
          transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
          hover:scale-110 hover:shadow-xl
          group
        `}
        style={{
          animation: 'gentle-pulse 3s ease-in-out infinite',
        }}
      >
        {/* Clock icon */}
        <Clock
          className={`
            ${iconSizeClasses[size]} 
            text-primary 
            transition-all duration-300
            group-hover:rotate-12
            drop-shadow-sm
          `}
        />

        {/* Animated ring around clock */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          style={{
            animation: 'pulse-ring 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Time display tooltip */}
      <div
        className={`
          absolute -bottom-16 left-1/2 transform -translate-x-1/2
          bg-background/95 backdrop-blur-sm
          border border-primary/20 rounded-lg
          px-3 py-2
          shadow-lg
          opacity-0 group-hover:opacity-100
          transition-all duration-300
          pointer-events-none
          z-10
          min-w-[120px] text-center
        `}
      >
        <div className="text-xs font-mono text-primary font-semibold">{formatTime(time)}</div>
        <div className="text-xs text-muted-foreground">{formatDate(time)}</div>

        {/* Tooltip arrow */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-background/95 border-l border-t border-primary/20 rotate-45" />
      </div>

      {/* Floating particles around clock */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute w-1 h-1 bg-primary/40 rounded-full
              animate-sparkle
            `}
            style={{
              top: `${20 + i * 30}%`,
              left: `${15 + i * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
