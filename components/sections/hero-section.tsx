import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Mail, Zap, Play } from 'lucide-react'
import Link from 'next/link'
import {
  AnimatedSection,
  FloatingElement,
  PulseButton,
  GradientText,
} from '@/components/ui/animations'

export function HeroSection() {
  return (
    <div className="max-w-3xl mx-auto text-center pt-10 pb-14 md:pt-16 md:pb-24">
      {/* Floating elements around hero */}
      <FloatingElement delay={0}>
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Zap className="w-8 h-8 text-primary" />
        </div>
      </FloatingElement>
      <FloatingElement delay={1}>
        <div className="absolute top-32 right-16 w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-amber-500" />
        </div>
      </FloatingElement>
      <FloatingElement delay={2}>
        <div className="absolute bottom-20 left-20 w-14 h-14 bg-pink-500/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-pink-500" />
        </div>
      </FloatingElement>

      <AnimatedSection delay={0} immediate>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-yellow-500/10 text-foreground text-sm mb-6">
          <Sparkles className="w-4 h-4 animate-pulse text-amber-500 fill-yellow-500 drop-shadow-lg" />
          <span className="font-medium">Lightning-fast AI Email Campaigns</span>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={250} immediate>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
          Converting email campaigns in{' '}
          <GradientText className="cursor-behind">seconds</GradientText> with
          Flashletter
        </h1>
      </AnimatedSection>

      <AnimatedSection delay={500} immediate>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto leading-relaxed">
          Transform your landing page into a complete email campaign. AI
          analyzes your content and creates personalized email sequences that
          convert.
        </p>
      </AnimatedSection>

      <AnimatedSection delay={750} immediate>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <PulseButton>
            <Button
              size="lg"
              asChild
              className="gap-2 text-base px-6 py-3 bg-gradient-to-r from-primary to-amber-500/70 hover:from-primary/90 hover:to-amber-500/60 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/create" prefetch={true}>
                Start Creating
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </PulseButton>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 text-base px-6 py-3 bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group"
          >
            <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Watch Demo
          </Button>
        </div>
      </AnimatedSection>

      {/* Stats section */}
      <AnimatedSection delay={1000} immediate>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">10x</div>
            <div className="text-sm text-muted-foreground">
              Faster Campaign Creation
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">45%</div>
            <div className="text-sm text-muted-foreground">
              Higher Open Rates
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">67%</div>
            <div className="text-sm text-muted-foreground">ROI Improvement</div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}
