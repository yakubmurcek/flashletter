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
  title: 'Flashletter - Lightning-fast AI email campaigns',
  description:
    'Generate complete email campaigns in seconds with AI. Transform landing pages into personalized email sequences.',
  keywords: [
    'email campaigns',
    'AI email generator',
    'newsletter tool',
    'email marketing',
    'AI copywriting',
    'email automation',
    'marketing automation',
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
    title: 'Flashletter - Lightning-fast AI email campaigns',
    description:
      'Generate complete email campaigns in seconds with AI. Transform landing pages into personalized email sequences.',
    siteName: 'Flashletter',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Flashletter - Lightning-fast AI email campaigns',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flashletter - Lightning-fast AI email campaigns',
    description:
      'Generate complete email campaigns in seconds with AI. Transform landing pages into personalized email sequences.',
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
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
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
                'Generate complete email campaigns in seconds with AI',
              url: process.env.NEXT_PUBLIC_APP_URL || 'https://flashletter.com',
              applicationCategory: 'BusinessApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
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
