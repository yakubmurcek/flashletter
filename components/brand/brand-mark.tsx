import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  href?: string
  size?: 'sm' | 'md'
  className?: string
}

export function BrandMark({ href = '/', size = 'sm', className }: BrandMarkProps) {
  const dot = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'
  const word = size === 'md' ? 'text-base' : 'text-[15px]'

  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2', className)}
      aria-label="Flashletter home"
    >
      <span className={cn('inline-block rounded-full bg-primary', dot)} />
      <span className={cn('font-semibold tracking-tight', word)}>flashletter</span>
    </Link>
  )
}
