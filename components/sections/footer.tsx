'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { PulseButton } from '@/components/ui/animations'
import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Footer() {
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
    <footer className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/icon-192.webp"
                alt="Flashletter"
                width={40}
                height={40}
                className="w-full h-full"
              />
            </div>
            <div>
              <span className="text-xl font-semibold">Flashletter</span>
              <p className="text-sm text-muted-foreground">
                Lighting-fast AI powered email campaigns
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              Features
            </a>
            {LANDING_PAGE_CONFIG.showProductFeatures && (
              <a
                href="#testimonials"
                className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              >
                Testimonials
              </a>
            )}
            {LANDING_PAGE_CONFIG.showProductFeatures && (
              <a
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              >
                Pricing
              </a>
            )}
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              FAQ
            </a>

            <PulseButton>
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50"
              >
                {LANDING_PAGE_CONFIG.showProductFeatures ? (
                  <Link href="/signup">Start Free Trial</Link>
                ) : (
                  <Link href="/#waitlist">Get Early Access</Link>
                )}
              </Button>
            </PulseButton>
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col">
            <div>
              © {new Date().getFullYear()} Flashletter 2025. All rights
              reserved.
            </div>
            <div className="text-xs text-muted-foreground opacity-80">
              Jakub Murcek — IČO 08294593
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105"
              href="https://x.com/ykbmck"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow @ykbmck
            </a>
            <a
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              href="/privacy"
            >
              Privacy Policy
            </a>
            <a
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              href="/terms"
            >
              Terms of Service
            </a>
            <a
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              href="/unsubscribe"
            >
              Unsubscribe
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
