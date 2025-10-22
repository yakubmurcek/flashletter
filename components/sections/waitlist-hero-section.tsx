import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Zap, Clock, Users, Mail } from 'lucide-react'
import {
  AnimatedSection,
  FloatingElement,
  PulseButton,
  GradientText,
} from '@/components/ui/animations'
import { WaitlistForm } from '@/components/waitlist-form'

export function WaitlistHeroSection() {
  return (
    <div className="relative max-w-4xl mx-auto text-center pb-14 md:-mt-4 md:pb-24">
      {/* Going Live Badge */}
      <AnimatedSection delay={0} immediate>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-full text-sm font-medium text-primary mt-2 mb-2 backdrop-blur-sm">
          <Clock className="w-4 h-4" />
          <span>Launching soon</span>
        </div>
      </AnimatedSection>

      {/* Floating elements around hero */}
      <FloatingElement
        delay={0.1}
        variant="sway"
        className="pointer-events-none absolute top-[-20px] lg:top-4 md:top-28 md:left-4 left-1"
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        </div>
      </FloatingElement>
      <FloatingElement
        delay={0.4}
        variant="sway"
        className="pointer-events-none absolute top-75 md:top-26 md:right-4 right-8 z-10"
      >
        <div className="md:w-12 md:h-12 w-5 h-5 bg-amber-400/10 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-amber-500" />
        </div>
      </FloatingElement>
      <FloatingElement
        delay={0.7}
        variant="gentle"
        className="pointer-events-none absolute bottom-0 left-0"
      >
        <div className="w-14 h-14 bg-pink-500/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-pink-500" />
        </div>
      </FloatingElement>

      <AnimatedSection delay={250} immediate>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.2]">
          Lightning-fast AI email campaigns{' '}
          <GradientText className="cursor-behind">coming soon</GradientText>
        </h1>
      </AnimatedSection>

      <AnimatedSection delay={500} immediate>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Transform your landing page into a complete email campaign. AI
          analyzes your content and creates personalized email sequences that
          convert.
        </p>
      </AnimatedSection>

      {/* Waitlist Form */}
      <div id="waitlist" className="max-w-md mx-auto mb-12 scroll-mt-40">
        <WaitlistForm />
      </div>

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
            <div className="text-3xl font-bold text-primary mb-2">25%</div>
            <div className="text-sm text-muted-foreground">
              Higher Open Rates
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">65%</div>
            <div className="text-sm text-muted-foreground">ROI Improvement</div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}
