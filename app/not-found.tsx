import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BrandMark } from '@/components/brand/brand-mark'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
      <BrandMark size="md" />
      <Card className="max-w-md w-full p-6 space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-display text-6xl text-muted-foreground">404</h1>
          <h2 className="text-display text-2xl">Page not found</h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Button
          asChild
          className="w-full"
        >
          <Link href="/">Return home</Link>
        </Button>
      </Card>
    </div>
  )
}
