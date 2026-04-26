'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/auth/user-menu'
import { BrandMark } from '@/components/brand/brand-mark'
import { useEffect, useState } from 'react'
import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'
import type { User } from '@supabase/supabase-js'

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user ?? null)
    }
    getUser()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { href: '#features', label: 'Features', show: true },
    {
      href: '#pricing',
      label: 'Pricing',
      show: LANDING_PAGE_CONFIG.showProductFeatures,
    },
    { href: '#faq', label: 'FAQ', show: true },
  ].filter((item) => item.show)

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <BrandMark href="/" />

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link href="/campaigns">My campaigns</Link>
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              {LANDING_PAGE_CONFIG.showProductFeatures && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              <Button
                size="sm"
                asChild
              >
                {LANDING_PAGE_CONFIG.showProductFeatures ? (
                  <Link href="/signup">Try free</Link>
                ) : (
                  <Link href="/login">Sign in</Link>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
