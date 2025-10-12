import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { CampaignProvider } from '@/lib/campaign-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampaignAI - AI-Powered Email Campaigns',
  description: 'Generate email campaigns in seconds',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <CampaignProvider>{children}</CampaignProvider>
        <Analytics />
      </body>
    </html>
  )
}
