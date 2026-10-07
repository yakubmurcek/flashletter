import { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppShell } from '@/components/layouts/app-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy | Flashletter',
  description: 'What personal data Flashletter collects, why, who processes it and your rights.',
}

const LAST_UPDATED = 'October 7, 2026'
const CONTACT_EMAIL = 'jakub@flashletter.app'

const mail = (
  <a
    href={`mailto:${CONTACT_EMAIL}`}
    className="text-primary hover:underline"
  >
    {CONTACT_EMAIL}
  </a>
)

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: '1. Who is responsible',
    body: (
      <p>
        The controller of your personal data is Jakub Murček, sole trader, IČO 08294593, Czech
        Republic, operating Flashletter (flashletter.app). Contact: {mail}.
      </p>
    ),
  },
  {
    title: '2. What we collect',
    body: (
      <ul className="list-disc list-inside space-y-2">
        <li>
          <strong>Account data:</strong> your email address and a hashed password, or your Google
          account email and name if you sign in with Google. If you try Flashletter before signing
          up, we create an anonymous account with no personal details.
        </li>
        <li>
          <strong>Your content:</strong> the landing page URLs you submit, the page text we read
          from them, the emails generated for you, your edits and version history, and your messages
          to the AI assistant.
        </li>
        <li>
          <strong>Billing data:</strong> if you subscribe to Pro, Stripe collects your card and
          billing details. We never see or store your full card number; we keep only your plan,
          subscription status and the Stripe customer reference.
        </li>
        <li>
          <strong>Technical data:</strong> browser, device, pages visited and error reports, used to
          keep the service working and secure. We use your IP address briefly for rate limiting and
          to pick the right consent options for your region; we do not store it with your account.
        </li>
        <li>
          <strong>Waitlist data:</strong> if you joined our earlier waitlist, the email and optional
          name you gave us, and your marketing choice.
        </li>
      </ul>
    ),
  },
  {
    title: '3. Why we use it and on what legal basis',
    body: (
      <ul className="list-disc list-inside space-y-2">
        <li>
          To provide Flashletter: create your account, generate and store your campaigns
          (performance of a contract).
        </li>
        <li>To keep the service secure, prevent abuse and fix errors (legitimate interest).</li>
        <li>To understand how the product is used so we can improve it (legitimate interest).</li>
        <li>
          To send product or marketing emails only if you opted in (consent, which you can withdraw
          at any time via the unsubscribe link or by email).
        </li>
      </ul>
    ),
  },
  {
    title: '4. AI processing',
    body: (
      <p>
        To write and edit your emails, the page text you submit and your assistant messages are sent
        to Anthropic&rsquo;s Claude API. Under Anthropic&rsquo;s commercial terms, API data is not
        used to train their models. We do not use your content to train any model either.
      </p>
    ),
  },
  {
    title: '5. Who processes your data',
    body: (
      <>
        <p className="mb-4">
          We do not sell your personal data. We share it only with providers that run Flashletter
          for us, under their data processing terms:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Supabase</strong>: database and sign-in (accounts, campaigns, waitlist).
          </li>
          <li>
            <strong>Anthropic</strong>: the Claude AI model that writes and edits your emails.
          </li>
          <li>
            <strong>Vercel</strong>: hosting of the website and app.
          </li>
          <li>
            <strong>Stripe</strong>: payments and subscription billing for Pro.
          </li>
          <li>
            <strong>Upstash</strong>: rate limiting and caching, if enabled.
          </li>
          <li>
            <strong>Sentry</strong>: error monitoring, which may include the email you entered if an
            error happens during sign-up.
          </li>
          <li>
            <strong>PostHog</strong>: product analytics, if enabled.
          </li>
          <li>
            <strong>Google</strong>: only if you choose Sign in with Google.
          </li>
        </ul>
        <p className="mt-4">
          We may also disclose data where the law requires it or to protect our rights.
        </p>
      </>
    ),
  },
  {
    title: '6. International transfers',
    body: (
      <p>
        Some providers, including Anthropic and Vercel, process data in the United States. Where
        data leaves the EU, we rely on the providers&rsquo; Standard Contractual Clauses or the
        EU-US Data Privacy Framework.
      </p>
    ),
  },
  {
    title: '7. How long we keep it',
    body: (
      <p>
        We keep your account and campaigns while your account exists, and delete them when you ask
        us to. Anonymous trial data may be deleted after a period of inactivity. Waitlist data is
        kept until you unsubscribe or ask for deletion. Error logs are kept for a limited time by
        our providers.
      </p>
    ),
  },
  {
    title: '8. Your rights',
    body: (
      <>
        <p className="mb-4">
          You can ask us to access, correct, delete or export your data, to restrict or object to
          processing, and withdraw consent at any time. Email {mail} and we will reply within 30
          days. You can also complain to the Czech data protection authority (ÚOOÚ, uoou.gov.cz) or
          the authority in your country.
        </p>
        <p>
          California residents have the right to know, delete and not be discriminated against for
          exercising these rights. We do not sell or share personal information for advertising.
        </p>
      </>
    ),
  },
  {
    title: '9. Cookies',
    body: (
      <p>
        We use cookies and local storage that are needed to keep you signed in and remember your
        privacy choice. Analytics, if enabled, follows the consent options shown to you.
      </p>
    ),
  },
  {
    title: '10. Children',
    body: <p>Flashletter is not intended for anyone under 16.</p>,
  },
  {
    title: '11. Changes',
    body: (
      <p>
        If we change this policy in a way that matters, we will update the date above and tell
        account holders by email or in the app.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <AppShell
      chrome="narrow"
      withFooter
    >
      <div className="text-center mb-12">
        <h1 className="text-display text-3xl md:text-4xl mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Last updated: <time dateTime="2026-10-07">{LAST_UPDATED}</time>
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">GDPR</Badge>
          <Badge variant="secondary">CCPA</Badge>
        </div>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{section.body}</CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
