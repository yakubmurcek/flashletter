import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Terms of Service | Flashletter',
  description:
    'Terms of Service for Flashletter - Legal terms and conditions for using our waitlist service.',
}

const LAST_UPDATED = 'June 12, 2024'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg">
            Last updated:{' '}
            <time dateTime="2024-06-12">{LAST_UPDATED}</time>
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                By accessing and using Flashletter&rsquo;s waitlist service, you
                accept and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Description of Service</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Flashletter is currently in development. Our waitlist service
                allows you to register your interest in being notified when our
                AI-powered email campaign platform becomes available. This is a
                free service with no obligation to purchase or use the final
                product.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                By using our waitlist service, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Provide accurate and truthful information</li>
                <li>Use only one email address per person</li>
                <li>Not attempt to circumvent any security measures</li>
                <li>Not use the service for any unlawful purpose</li>
                <li>Respect the intellectual property rights of Flashletter</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your privacy is important to us. Please review our{' '}
                  <Link
                    href="/privacy"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  , which also governs your use of the service, to understand
                  our practices.
                </p>
                <p>
                  When you join the waitlist we collect the information you
                  submit (typically your email address and an optional name) so
                  we can send operational updates about Flashletter. If you
                  choose to opt in to receive additional marketing
                  communications, we will also send occasional product news and
                  promotions. You can withdraw consent or unsubscribe at any
                  time by using the unsubscribe link included in every message
                  or by contacting us directly.
                </p>
                <p>
                  By using our service, you consent to the collection and use of
                  information in accordance with our Privacy Policy and the
                  selections you make in the waitlist form.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The service and its original content, features, and
                functionality are and will remain the exclusive property of
                Flashletter and its licensors. The service is protected by
                copyright and other applicable laws. The Flashletter name and
                branding may not be used in connection with any product or
                service without our prior written consent.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Disclaimers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The information on this service is provided on an &ldquo;as
                is&rdquo; basis.
                To the fullest extent permitted by law, Flashletter:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  Excludes all representations and warranties relating to this
                  service and its contents
                </li>
                <li>
                  Does not guarantee that the service will be available at all
                  times
                </li>
                <li>
                  Does not guarantee that joining the waitlist will result in
                  early access
                </li>
                <li>
                  Reserves the right to modify or discontinue the service at any
                  time
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                In no event shall Flashletter, nor its directors, employees,
                partners, agents, suppliers, or affiliates, be liable for any
                indirect, incidental, special, consequential, or punitive
                damages, including without limitation, loss of profits, data,
                use, goodwill, or other intangible losses, resulting from your
                use of the service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Indemnification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You agree to defend, indemnify, and hold harmless Flashletter
                and its licensee and licensors, and their employees,
                contractors, agents, officers and directors, from and against
                any and all claims, damages, obligations, losses, liabilities,
                costs or debt, and expenses (including but not limited to
                attorney&rsquo;s fees).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We may terminate or suspend your access immediately, without
                prior notice or liability, for any reason whatsoever, including
                without limitation if you breach the Terms. Upon termination,
                your right to use the service will cease immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                These Terms shall be interpreted and governed by the laws of the
                Czech Republic, without regard to its conflict of law
                provisions. Our failure to enforce any right or provision of
                these Terms will not be considered a waiver of those rights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We reserve the right, at our sole discretion, to modify or
                replace these Terms at any time. If a revision is material, we
                will try to provide at least 30 days notice prior to any new
                terms taking effect. What constitutes a material change will be
                determined at our sole discretion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please
                contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Email:</strong> yakubmurcek@gmail.com
                </p>

                <p>
                  <strong>IČO:</strong> 08294593
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
