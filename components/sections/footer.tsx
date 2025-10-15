import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { PulseButton } from '@/components/ui/animations'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/icon-192.png"
                alt="Flashletter"
                width={40}
                height={40}
                className="w-full h-full"
              />
            </div>
            <div>
              <span className="text-xl font-semibold">Flashletter</span>
              <p className="text-sm text-muted-foreground">
                AI-powered email campaigns
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
            >
              Testimonials
            </a>
            <a
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors hover:scale-105"
            >
              Sign In
            </Link>
            <PulseButton>
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-primary to-purple-600/70 hover:from-primary/90 hover:to-purple-600/60"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
            </PulseButton>
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
          <div>
            © {new Date().getFullYear()} Flashletter. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a
              className="hover:text-foreground transition-colors"
              href="mailto:support@flashletter.com"
            >
              support@flashletter.com
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="/privacy"
            >
              Privacy Policy
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="/terms"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
