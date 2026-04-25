'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/auth/user-menu'
import { PulseButton } from '@/components/ui/animations'
import { useEffect, useState } from 'react'
import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'
import type { User } from '@supabase/supabase-js'

export function Header() {
  const [user, setUser] = useState<User | null>(null)

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

  const navItems = [
    { href: '#features', label: 'Features', show: true },
    {
      href: '#testimonials',
      label: 'Testimonials',
      show: LANDING_PAGE_CONFIG.showProductFeatures,
    },
    {
      href: '#pricing',
      label: 'Pricing',
      show: LANDING_PAGE_CONFIG.showProductFeatures,
    },
    { href: '#faq', label: 'FAQ', show: true },
  ].filter((item) => item.show)

  return (
    <header className="border-b border-border backdrop-blur-sm bg-background/80 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <Image
            src="/icon-192.webp"
            alt="Flashletter"
            width={40}
            height={40}
            className="transition-transform duration-300 group-hover:scale-110"
            priority
          />
          <span
            className="text-lg font-semibold group-hover:text-primary
            transition-colors"
          >
            Flashletter
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition duration-300 hover:scale-105"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hover:scale-105 transition"
              >
                <Link href="/campaigns">My Campaigns</Link>
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
                  className="hover:scale-105 transition"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
              <PulseButton>
                <Button
                  size="sm"
                  asChild
                  className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 transition-transform duration-300"
                >
                  {LANDING_PAGE_CONFIG.showProductFeatures ? (
                    <Link href="/signup">Get Started</Link>
                  ) : (
                    <Link href="/login">Sign In</Link>
                  )}
                </Button>
              </PulseButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
