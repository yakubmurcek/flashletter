'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AnimatedSection, GradientText, FloatingElement } from '@/components/ui/animations'

export function FullProductHeroSection() {
  return (
    <div className="relative text-center py-20 md:py-32">
      {/* Floating elements */}
      <FloatingElement
        delay={0}
        className="absolute pointer-events-none top-20 left-10"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-amber-400/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <FloatingElement
        delay={1000}
        className="absolute pointer-events-none top-40 right-20"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <FloatingElement
        delay={2000}
        className="absolute pointer-events-none bottom-20 left-1/3"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-full blur-xl"></div>
      </FloatingElement>

      <AnimatedSection
        delay={250}
        immediate
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            For founders who hate writing from scratch
          </span>
        </div>
      </AnimatedSection>

      <AnimatedSection
        delay={250}
        immediate
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.2]">
          Turn your landing page into a{' '}
          <GradientText className="cursor-behind">
            full newsletter campaign in 30 seconds
          </GradientText>
        </h1>
      </AnimatedSection>

      <AnimatedSection
        delay={500}
        immediate
      >
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Stop staring at a blank editor. Start from a ready‑to‑send sequence you just tweak.
        </p>
      </AnimatedSection>

      {/* CTA Buttons */}
      <AnimatedSection
        delay={750}
        immediate
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-400 to-amber-300/70 hover:from-orange-400/90 hover:to-amber-300/50 text-white px-8 py-3 text-lg font-semibold transition-all duration-300"
            asChild
          >
            <Link
              href="/create"
              className="flex items-center gap-2"
            >
              Start Creating Campaigns
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="px-8 py-3 text-lg font-semibold border-border/60 hover:border-primary/50"
            asChild
          >
            <Link
              href="#demo"
              className="flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </Link>
          </Button>
        </div>
      </AnimatedSection>

      {/* Stats section */}
      <AnimatedSection
        delay={1000}
        immediate
      >
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">10x</div>
            <div className="text-sm text-muted-foreground">Faster Campaign Creation</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">25%</div>
            <div className="text-sm text-muted-foreground">Higher Open Rates</div>
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
