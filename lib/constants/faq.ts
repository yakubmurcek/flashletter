import type { FAQItem } from '@/components/ui/faq'

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what-is-flashletter',
    question: 'What is Flashletter?',
    answer:
      'Flashletter helps you turn your landing page content into a full newsletter campaign in about 2 minutes. It writes the copy for you, so you simply tweak and send.',
  },
  {
    id: 'how-it-works',
    question: 'How does it work?',
    answer:
      'Enter your landing page URL, and our AI analyzes your content to generate a tailored email sequence. You get a ready-to-send campaign that matches your brand voice.',
  },
  {
    id: 'integrations',
    question: 'Does it work with my email provider?',
    answer:
      'We are building direct integrations with major platforms. For now, you can easily copy and paste the generated content into any email marketing tool you use.',
  },
  {
    id: 'free-plan',
    question: 'Is there a free plan?',
    answer:
      'Yes. You can try Flashletter without signing up, and a free account includes 3 campaigns a month. Pro removes the limits for $19 a month or $190 a year.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Manage or cancel your subscription from your account page in two clicks; you keep Pro until the end of the period you paid for. If Pro is not for you, email us within 14 days of your first payment for a full refund.',
  },
  {
    id: 'data',
    question: 'What happens to my landing page and emails?',
    answer:
      'Your campaigns are private to your account. Emails are written by Anthropic\u2019s Claude, and API data is not used to train models. Payments are handled by Stripe; we never see your card.',
  },
]
