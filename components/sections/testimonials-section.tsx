import { Star } from 'lucide-react'
import { AnimatedSection, GradientText } from '@/components/ui/animations'

export function TestimonialsSection() {
  return (
    <AnimatedSection delay={250}>
      <section
        id="testimonials"
        aria-label="Testimonials"
        className="py-14 md:py-20"
      >
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <GradientText>Loved by teams worldwide</GradientText>
          </h2>
          <p className="text-muted-foreground text-lg">
            See how Flashletter is transforming email marketing for companies of
            all sizes.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
              <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                "
              </span>
              Flashletter cut our email campaign creation time from 3 days to 30
              minutes. Our open rates jumped 45% and we're finally hitting our
              quarterly targets consistently.
              <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                "
              </span>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                AT
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  Ava Thompson
                </div>
                <div className="text-sm text-muted-foreground">
                  Growth Lead at TechFlow
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
              <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                "
              </span>
              The AI perfectly captures our brand voice across all campaigns.
              What used to take our entire marketing team a week now happens in
              hours. ROI increased by 67% in just two months.
              <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                "
              </span>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                DM
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  Diego Martinez
                </div>
                <div className="text-sm text-muted-foreground">
                  CMO at GrowthCo
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
              <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                "
              </span>
              The collaborative features are game-changing. Our distributed team
              can now work on campaigns in real-time. Customer engagement is up
              52% since we started using Flashletter.
              <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                "
              </span>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                MC
              </div>
              <div>
                <div className="font-semibold text-foreground">Mia Chen</div>
                <div className="text-sm text-muted-foreground">
                  Product Ops at InnovateLab
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional testimonial row */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10">
          <div className="group bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
              <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                "
              </span>
              As a startup, we needed to move fast without sacrificing quality.
              Flashletter delivers professional campaigns that look like they
              came from a Fortune 500 company. Our conversion rate tripled.
              <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                "
              </span>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                JS
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  James Sullivan
                </div>
                <div className="text-sm text-muted-foreground">
                  Founder at StartupXYZ
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <blockquote className="text-lg leading-relaxed mb-6 text-foreground relative">
              <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">
                "
              </span>
              The A/B testing features helped us discover what resonates with
              our audience. We've seen a 78% improvement in click-through rates
              and our unsubscribe rate dropped to almost zero.
              <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">
                "
              </span>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                RK
              </div>
              <div>
                <div className="font-semibold text-foreground">Rachel Kim</div>
                <div className="text-sm text-muted-foreground">
                  Email Marketing Manager at DataCorp
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}
