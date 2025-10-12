import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
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
            {backHref ? (
              <Button variant="ghost" size="sm" asChild className="gap-2">
                <Link href={backHref}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </Button>
            ) : (
              <div />
            )}
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
