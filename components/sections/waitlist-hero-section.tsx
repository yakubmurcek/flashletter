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
    <div className="max-w-4xl mx-auto text-center pt-10 pb-14 md:pt-16 md:pb-24">
      {/* Floating elements around hero */}
      <FloatingElement delay={0}>
        <div className="absolute top-[152px] md:top-2 md:left-10 left-3 w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Zap className="w-6 h-6 md:w-8 md:h-8 text-primary" />
        </div>
      </FloatingElement>
      <FloatingElement delay={1}>
        <div className="absolute top-[45px] md:top-32 md:right-4 right-48 md:w-12 md:h-12 w-5 h-5 bg-amber-400/10 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-amber-500" />
        </div>
      </FloatingElement>
      <FloatingElement delay={2}>
        <div className="absolute bottom-20 left-20 w-14 h-14 bg-pink-500/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-pink-500" />
        </div>
      </FloatingElement>

      <AnimatedSection delay={0} immediate>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-amber-300/10 text-foreground text-sm mb-6">
          <Clock className="w-5 h-5 animate-pulse text-amber-500 drop-shadow-lg" />
          <span className="font-medium">Coming Soon - Join the Waitlist</span>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={250} immediate>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          Lightning-fast AI email campaigns{' '}
          <GradientText className="cursor-behind">coming soon</GradientText>
        </h1>
      </AnimatedSection>

      <AnimatedSection delay={500} immediate>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Transform your landing page into a complete email campaign in seconds.
          AI analyzes your content and creates personalized email sequences that
          convert.
        </p>
      </AnimatedSection>

      {/* Waitlist Form */}
      <div id="waitlist" className="max-w-md mx-auto mb-12">
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
