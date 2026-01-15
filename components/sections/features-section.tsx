import { Sparkles, Users, Link } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatedSection, GradientText } from '@/components/ui/animations'

export function FeaturesSection() {
  return (
    <AnimatedSection delay={250}>
      <section
        id="features"
        aria-label="Features"
        className="py-14 md:py-20"
      >
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <GradientText>Powerful Features</GradientText>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to ship effective newsletter campaigns fast.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/8 transition duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400/10 to-amber-400/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
              Custom AI
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Writes your launch sequence so you only tweak and send.
            </p>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/8 transition duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Link className="w-8 h-8 text-primary" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                Integrations
              </h3>
              <Badge
                variant="secondary"
                className="text-xs"
              >
                Coming Soon
              </Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Seamlessly export to popular email platforms like Mailchimp and ConvertKit.
            </p>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/8 transition duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                Team Collab
              </h3>
              <Badge
                variant="secondary"
                className="text-xs"
              >
                Coming Soon
              </Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Work together seamlessly with real-time collaboration workflows.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}
