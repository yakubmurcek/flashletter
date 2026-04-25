import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Privacy Policy | Flashletter',
  description:
    'Privacy Policy for Flashletter - GDPR and CCPA compliant data protection information.',
}

const LAST_UPDATED = 'June 12, 2024'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">
            Last updated: <time dateTime="2024-06-12">{LAST_UPDATED}</time>
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary">GDPR Compliant</Badge>
            <Badge variant="secondary">CCPA Compliant</Badge>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Waitlist Information</h3>
                <p className="text-muted-foreground">When you join our waitlist, we collect:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Email address (required)</li>
                  <li>Name (optional)</li>
                  <li>Timestamp of signup</li>
                </ul>
                <p className="mt-3 text-muted-foreground text-sm">
                  We do not store your IP address. We only receive coarse region information through
                  our hosting provider so we can show the right consent options (for example, GDPR
                  prompts in the EU), and we discard that information after the consent decision.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Technical Information</h3>
                <p className="text-muted-foreground">
                  We automatically collect certain technical information:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Pages visited on our website</li>
                  <li>Referral source</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We use your information solely for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>To notify you when Flashletter becomes available</li>
                <li>
                  To send service or operational updates about our product development and waitlist
                  status
                </li>
                <li>
                  To send additional marketing updates, tips, or promotions—but only if you have
                  explicitly opted in. Every marketing message includes an unsubscribe link so you
                  can withdraw consent at any time.
                </li>
                <li>To improve our website and services</li>
                <li>To prevent fraud and ensure security</li>
                <li>To comply with legal obligations</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                We honor the selections you make in the waitlist form. If you do not opt in to
                marketing communications, we will not send them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Legal Basis for Processing (GDPR)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Under GDPR, we process your personal data based on:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>Consent:</strong> You have given clear consent for us to process your
                  personal data for the specific purpose of joining our waitlist and, where
                  selected, to receive optional marketing communications
                </li>
                <li>
                  <strong>Legitimate Interest:</strong> We have a legitimate interest in improving
                  our services and preventing fraud
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">GDPR Rights (EU Residents)</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Right to access your personal data</li>
                    <li>Right to rectification of inaccurate data</li>
                    <li>Right to erasure (&ldquo;right to be forgotten&rdquo;)</li>
                    <li>Right to restrict processing</li>
                    <li>Right to data portability</li>
                    <li>Right to object to processing</li>
                    <li>Right to withdraw consent at any time</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground text-sm">
                    You can unsubscribe at any time using the link provided in our emails or by
                    contacting us directly.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">CCPA Rights (California Residents)</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Right to know what personal information is collected</li>
                    <li>Right to delete personal information</li>
                    <li>Right to opt-out of the sale of personal information</li>
                    <li>Right to non-discrimination for exercising privacy rights</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Sharing and Third Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may
                share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>
                  With service providers who assist us in operating our website (under strict data
                  protection agreements)
                </li>
              </ul>
              <div className="mt-4 space-y-2 text-muted-foreground text-sm">
                <p>
                  In particular, we rely on the following processors to deliver the waitlist
                  experience:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Supabase:</strong> Cloud database and auth provider we use to store
                    waitlist submissions and related metadata.
                  </li>
                  <li>
                    <strong>Sentry:</strong> Error monitoring service that helps us diagnose and fix
                    issues. Sentry receives technical error details and may include the email
                    address you entered if an error occurs during signup.
                  </li>
                </ul>
                <p>
                  These providers only process data on our behalf and in accordance with their data
                  protection addenda. We regularly review them to ensure they maintain appropriate
                  safeguards.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your
                personal data against unauthorized access, alteration, disclosure, or destruction.
                This includes encryption, secure servers, and regular security assessments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We retain your waitlist information until you request its deletion or until
                it&rsquo;s no longer necessary for the purposes outlined in this policy. You can
                request deletion at any time by contacting us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your data may be transferred to and processed in countries other than your own. We
                ensure appropriate safeguards are in place to protect your data in accordance with
                applicable data protection laws.
              </p>
              <p className="text-muted-foreground mt-4 text-sm">
                We host our core waitlist data in Supabase&rsquo;s EU region and use Sentry&rsquo;s
                EU data residency option for error monitoring. They commit to appropriate transfer
                safeguards. You can review their individual data protection terms via
                Supabase&rsquo;s and Sentry&rsquo;s privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children&rsquo;s Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our service is not intended for children under 16. We do not knowingly collect
                personal information from children under 16. If you are a parent or guardian and
                believe your child has provided us with personal information, please contact us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any
                changes by posting the new privacy policy on this page and updating the &ldquo;Last
                updated&rdquo; date. We encourage you to review this privacy policy periodically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this privacy policy or wish to exercise your rights,
                please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Email:</strong> yakubmurcek@gmail.com
                </p>
                <p>
                  <strong>Data Protection Officer:</strong> Jakub Murcek
                </p>
                <p>
                  <strong>IČO:</strong> 08294593
                </p>
                <p className="mt-4">
                  <strong>Quick Actions:</strong>{' '}
                  <a
                    href="/unsubscribe"
                    className="text-primary hover:underline"
                  >
                    Unsubscribe from waitlist
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
