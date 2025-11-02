import {
  Zap,
  Sparkles,
  Clock,
  Target,
  Award,
  Users,
  Mail,
  Link,
} from 'lucide-react'
import { AnimatedSection, GradientText } from '@/components/ui/animations'

export function FeaturesSection() {
  return (
    <AnimatedSection delay={250}>
      <section id="features" aria-label="Features" className="py-14 md:py-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <GradientText>Powerful Features</GradientText>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to ship effective newsletter campaigns fast.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
              Lightning Fast
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Generate complete email campaigns in seconds. No more hours spent
              writing copy. The AI analyzes your existing website.
            </p>
            <div className="mt-4 flex items-center text-sm text-primary font-medium">
              <Clock className="w-4 h-4 mr-2" />
              <span>30 seconds average</span>
            </div>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400/10 to-amber-400/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
              Custom AI
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              It knows about converting newsletters and creates contextually
              relevant emails that perfectly match your brand voice.
            </p>
            <div className="mt-4 flex items-center text-sm text-primary font-medium">
              <Target className="w-4 h-4 mr-2" />
              <span>95% accuracy rate</span>
            </div>
          </div>

          <div className="group bg-card border border-border rounded-xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-300/10 to-orange-300/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Mail className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
              Fully Editable
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Customize every aspect of your emails with an intuitive editor and
              AI assistant that helps you refine your campaigns even further.
            </p>
            <div className="mt-4 flex items-center text-sm text-primary font-medium">
              <Award className="w-4 h-4 mr-2" />
              <span>Full control</span>
            </div>
          </div>
        </div>

        {/* Additional features grid */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mt-10">
          <div className="group bg-gradient-to-br from-primary/5 to-amber-400/5 border border-primary/20 rounded-xl p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Link className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Platform Integrations</h3>
            </div>
            <p className="text-muted-foreground">
              Seamlessly export to popular email platforms like Mailchimp,
              ConvertKit, and more with one-click integration.
            </p>
          </div>

          <div className="group bg-gradient-to-br from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl p-8 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold">Team Collaboration</h3>
            </div>
            <p className="text-muted-foreground">
              Work together seamlessly with real-time collaboration, comments,
              and approval workflows.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}
