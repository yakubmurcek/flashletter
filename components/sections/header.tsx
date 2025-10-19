'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { UserMenu } from '@/components/auth/user-menu'
import { PulseButton } from '@/components/ui/animations'
import { useEffect, useState } from 'react'

export function Header() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <header className="border-b border-border backdrop-blur-sm bg-background/80 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-10 h-10 rounded-lg overflow-hidden
            group-hover:scale-110 transition-transform duration-300"
          >
            <Image
              src="/icon-192.webp"
              alt="Flashletter"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span
            className="text-xl font-semibold group-hover:text-primary
            transition-colors"
          >
            Flashletter
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
          >
            Features
          </a>
          <a
            href="#testimonials"
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
          >
            Testimonials
          </a>
          <a
            href="#faq"
            className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
          >
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hover:scale-105 transition-transform"
          >
            <a href="#waitlist">Join Waitlist</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
