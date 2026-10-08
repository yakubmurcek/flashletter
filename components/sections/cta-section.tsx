import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/ui/reveal'

export function CTASection() {
  return (
    <section
      aria-label="Get started"
      className="border-y border-border"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <Reveal className="max-w-3xl">
          <h2 className="text-display text-4xl md:text-6xl text-foreground mb-6">
            The blank page is the hardest part.
            <br />
            <span className="text-muted-foreground">We took it off the table.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              asChild
              className="rounded-full px-6"
            >
              <Link href="/#try">
                Try free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">No signup, no credit card.</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
