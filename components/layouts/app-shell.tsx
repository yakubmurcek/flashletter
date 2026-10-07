import type { ReactNode } from 'react'
import { ProductHeader } from '@/components/layouts/product-header'
import { Footer } from '@/components/sections/footer'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  chrome?: 'default' | 'narrow' | 'centered'
  backHref?: string
  backLabel?: string
  homeHref?: string
  headerRight?: ReactNode
  alwaysSolidHeader?: boolean
  withFooter?: boolean
  mainClassName?: string
}

// Top padding includes the fixed 3.5rem header; a bare `py-*` here would
// override the header offset and tuck content under it.
const chromeClass: Record<NonNullable<AppShellProps['chrome']>, string> = {
  default: 'w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10',
  narrow: 'w-full max-w-2xl mx-auto px-4 sm:px-6 pt-26 pb-12',
  centered: 'flex-1 flex items-center justify-center px-4 pt-24 pb-10',
}

export function AppShell({
  children,
  chrome = 'default',
  backHref,
  backLabel,
  homeHref,
  headerRight,
  alwaysSolidHeader,
  withFooter = false,
  mainClassName,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProductHeader
        backHref={backHref}
        backLabel={backLabel}
        homeHref={homeHref}
        right={headerRight}
        alwaysSolid={alwaysSolidHeader}
      />
      <main className={cn('flex-1', chromeClass[chrome], mainClassName)}>{children}</main>
      {withFooter ? <Footer /> : null}
    </div>
  )
}
