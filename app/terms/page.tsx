import { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/layouts/app-shell'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Flashletter, the AI newsletter campaign generator.',
}

const LAST_UPDATED = 'October 7, 2026'
const CONTACT_EMAIL = 'jakub@flashletter.app'

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: '1. Who we are',
    body: (
      <p>
        Flashletter (flashletter.app) is operated by Jakub Murček, a sole trader registered in the
        Czech Republic, IČO 08294593 (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
        using Flashletter you agree to these terms. If you do not agree, please do not use the
        service.
      </p>
    ),
  },
  {
    title: '2. The service',
    body: (
      <>
        <p className="mb-4">
          Flashletter reads a landing page you point it at and uses AI to draft an email sequence
          you can edit and copy into your own email tool. It does not send campaigns to your
          subscribers.
        </p>
        <p>
          Flashletter has a Free plan with monthly limits and a paid Pro plan. The current limits
          and prices are shown on our{' '}
          <Link
            href="/pricing"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            pricing page
          </Link>
          . Features may change over time.
        </p>
      </>
    ),
  },
  {
    title: '3. Paid plans, billing and cancellation',
    body: (
      <ul className="list-disc list-inside space-y-2">
        <li>
          Pro is a subscription billed monthly or yearly in advance through Stripe, our payment
          processor. Prices are in US dollars; taxes may be added where the law requires.
        </li>
        <li>
          Your subscription renews automatically until you cancel. You can cancel anytime from your
          account page; you keep Pro until the end of the period you paid for.
        </li>
        <li>
          If you are not happy, write to us within 14 days of your first payment and we will refund
          it in full. After that, payments are not refundable except where the law requires.
        </li>
        <li>
          We will tell you at least 30 days before a price change applies to your subscription, and
          you can cancel before it takes effect.
        </li>
      </ul>
    ),
  },
  {
    title: '4. Your account',
    body: (
      <ul className="list-disc list-inside space-y-2">
        <li>You must be at least 16 years old.</li>
        <li>Keep your login details safe; you are responsible for activity on your account.</li>
        <li>
          You can try Flashletter before signing up. Drafts made without an account may be deleted
          if you never create one.
        </li>
      </ul>
    ),
  },
  {
    title: '5. Acceptable use',
    body: (
      <>
        <p className="mb-4">Please do not use Flashletter to:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>process pages you are not allowed to use, or infringe anyone&rsquo;s rights;</li>
          <li>write spam, scams, phishing or misleading claims;</li>
          <li>break the law, including anti-spam and consumer protection rules;</li>
          <li>overload, probe or get around the limits and security of the service.</li>
        </ul>
      </>
    ),
  },
  {
    title: '6. Your content and AI output',
    body: (
      <>
        <p className="mb-4">
          You keep all rights to what you submit and to the emails Flashletter generates for you.
          You give us permission to process that content only to run the service for you.
        </p>
        <p>
          Drafts are written by an AI model (Anthropic&rsquo;s Claude). AI can get facts wrong, so
          review every email before you send it. You are responsible for what you send to your
          audience.
        </p>
      </>
    ),
  },
  {
    title: '7. Availability and warranty',
    body: (
      <p>
        We work to keep Flashletter running and accurate, but it is provided &ldquo;as is&rdquo;
        without warranties, and we cannot promise it will always be available or error free.
      </p>
    ),
  },
  {
    title: '8. Limitation of liability',
    body: (
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, such
        as lost profits or data, arising from your use of Flashletter. Nothing in these terms limits
        rights you have as a consumer that cannot be excluded by law.
      </p>
    ),
  },
  {
    title: '9. Ending your use',
    body: (
      <p>
        You can stop using Flashletter at any time and ask us to delete your account by writing to{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {CONTACT_EMAIL}
        </a>
        . We may suspend accounts that break these terms.
      </p>
    ),
  },
  {
    title: '10. Privacy',
    body: (
      <p>
        How we handle personal data is described in our{' '}
        <Link
          href="/privacy"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    title: '11. Changes and governing law',
    body: (
      <p>
        We may update these terms; if a change matters, we will tell you by email or in the app
        before it takes effect. These terms are governed by Czech law.
      </p>
    ),
  },
  {
    title: '12. Contact',
    body: (
      <div className="space-y-2">
        <p>
          <strong>Email:</strong>{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          <strong>Operator:</strong> Jakub Murček, IČO 08294593, Czech Republic
        </p>
      </div>
    ),
  },
]

export default function TermsOfServicePage() {
  return (
    <AppShell
      chrome="narrow"
      withFooter
    >
      <div className="text-center mb-12">
        <h1 className="text-display text-3xl md:text-4xl mb-4">Terms of Service</h1>
        <p className="text-muted-foreground leading-relaxed">
          Last updated: <time dateTime="2026-10-07">{LAST_UPDATED}</time>
        </p>
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
