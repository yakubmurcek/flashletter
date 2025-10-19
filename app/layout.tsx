import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { CampaignProvider } from '@/lib/campaign-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  title: 'Flashletter - Join the Waitlist for AI Email Campaigns',
  description:
    'Join the waitlist for Flashletter - the AI-powered email campaign generator. Transform landing pages into personalized email sequences in seconds.',
  keywords: [
    'email campaigns',
    'AI email generator',
    'newsletter tool',
    'email marketing',
    'AI copywriting',
    'email automation',
    'marketing automation',
    'waitlist',
    'coming soon',
  ],
  authors: [{ name: 'Flashletter' }],
  creator: 'Flashletter',
  publisher: 'Flashletter',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://flashletter.com'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Flashletter - Join the Waitlist for AI Email Campaigns',
    description:
      'Join the waitlist for Flashletter - the AI-powered email campaign generator. Transform landing pages into personalized email sequences in seconds.',
    siteName: 'Flashletter',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Flashletter - Join the Waitlist for AI Email Campaigns',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flashletter - Join the Waitlist for AI Email Campaigns',
    description:
      'Join the waitlist for Flashletter - the AI-powered email campaign generator. Transform landing pages into personalized email sequences in seconds.',
    images: ['/og-image.png'],
    creator: '@flashletter',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flashletter',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Flashletter',
              description:
                'AI-powered email campaign generator - Join the waitlist for lightning-fast email campaigns',
              url: process.env.NEXT_PUBLIC_APP_URL || 'https://flashletter.com',
              applicationCategory: 'BusinessApplication',
              applicationStatus: 'ComingSoon',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/PreOrder',
              },
            }),
          }}
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          themes={['light']}
        >
          <CampaignProvider>{children}</CampaignProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
