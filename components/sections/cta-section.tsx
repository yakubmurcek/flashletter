import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from 'lucide-react'
import Link from 'next/link'
import { PulseButton } from '@/components/ui/animations'

export function CTASection() {
  return (
    <section className="py-14 md:py-20 bg-gradient-to-br from-primary/5 to-amber-400/5 border-y border-primary/10 w-screen mx-[calc(50%-50vw)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to transform your email marketing?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of users already using Flashletter to create high-converting email
            campaigns in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PulseButton>
              <Button
                size="lg"
                asChild
                className="gap-2 text-base bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </PulseButton>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
