'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProductHeaderProps {
  backHref?: string
  backLabel?: string
  homeHref?: string
  right?: ReactNode
  alwaysSolid?: boolean
}

export function ProductHeader({
  backHref,
  backLabel = 'Back',
  homeHref = '/',
  right,
  alwaysSolid = false,
}: ProductHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (alwaysSolid) return
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [alwaysSolid])

  const isSolid = alwaysSolid || scrolled

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-colors duration-200',
        isSolid
          ? 'bg-background/80 backdrop-blur-md border-b border-border'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {backHref ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-2 -ml-2"
              >
                <Link href={backHref}>
                  <ArrowLeft className="w-4 h-4" />
                  {backLabel}
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
            </>
          ) : null}
          <BrandMark href={homeHref} />
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </header>
  )
}
