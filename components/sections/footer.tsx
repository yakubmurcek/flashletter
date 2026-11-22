import Link from 'next/link'
import { BrandMark } from '@/components/brand/brand-mark'
import { LANDING_PAGE_CONFIG } from '@/lib/constants/app'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="mb-3">
              <BrandMark href="/" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Turn your landing page into a newsletter campaign in 2 minutes.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Product
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/#features"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              {LANDING_PAGE_CONFIG.showProductFeatures && (
                <li>
                  <Link
                    href="/pricing"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/#faq"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Legal
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="mailto:jakub@flashletter.app"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link
                  href="/unsubscribe"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Unsubscribe
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="font-mono text-xs text-muted-foreground">
            © {year} flashletter · Jakub Murcek, IČO 08294593
          </div>
          <a
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href="https://x.com/ykbmck"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @ykbmck
          </a>
        </div>
      </div>
    </footer>
  )
}
