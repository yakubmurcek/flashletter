import { FAQ } from '@/components/ui/faq'
import { FAQ_ITEMS } from '@/lib/constants/faq'
import { AnimatedSection } from '@/components/ui/animations'

export function FAQSection() {
  return (
    <AnimatedSection delay={250}>
      <section
        id="faq"
        aria-label="FAQ"
        className="py-16 md:py-24"
      >
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about Flashletter.
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <FAQ items={FAQ_ITEMS} />
        </div>
      </section>
    </AnimatedSection>
  )
}
