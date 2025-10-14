import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface CampaignLayoutProps {
  children: ReactNode
  backHref?: string
  showHeader?: boolean
  headerContent?: ReactNode
}

export function CampaignLayout({
  children,
  backHref,
  showHeader = true,
  headerContent,
}: CampaignLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && (
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              {backHref ? (
                <>
                  <Button variant="ghost" size="sm" asChild className="gap-2">
                    <Link href={backHref}>
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Link>
                  </Button>
                  <div className="h-6 w-px bg-border" />
                </>
              ) : null}
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold">Flashletter</span>
              </Link>
            </div>
            {headerContent}
          </div>
        </header>
      )}
      <main className="flex-1 container mx-auto px-4 flex items-center justify-center">
        {children}
      </main>
    </div>
  )
}
