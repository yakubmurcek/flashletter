import { FAQ } from '@/components/ui/faq'
import { FAQ_ITEMS } from '@/lib/constants/faq'

export function FAQSection() {
  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="py-24 md:py-32"
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-display text-3xl md:text-5xl text-foreground mb-4">Questions.</h2>
        <p className="text-muted-foreground text-lg mb-12">The honest answers.</p>
        <FAQ items={FAQ_ITEMS} />
      </div>
    </section>
  )
}
