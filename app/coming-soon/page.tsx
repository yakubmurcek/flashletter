import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { WaitlistForm } from '@/components/waitlist-form'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Coming Soon</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Flashletter is currently in development. Join our waitlist to be the
            first to experience lightning-fast AI newsletter campaigns.
          </p>
        </div>

        <div className="mb-8">
          <WaitlistForm />
        </div>

        <Button variant="outline" asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <CookieConsentBanner />
    </div>
  )
}
