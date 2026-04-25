import { WaitlistForm } from '@/components/waitlist-form'

export function WaitlistHeroSection() {
  return (
    <section className="pt-24 md:pt-32 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-medium text-muted-foreground mb-6 tracking-tight">
          Launching soon
        </p>

        <h1 className="text-display text-5xl md:text-7xl text-foreground mb-6">
          Lightning-fast AI newsletter campaigns,{' '}
          <span className="cursor-behind text-primary">coming soon.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Turn your landing page into a complete email campaign. AI reads your content and writes a
          sequence that sounds like the page it came from.
        </p>
      </div>

      <div
        id="waitlist"
        className="max-w-md mx-auto mt-4 scroll-mt-40"
      >
        <WaitlistForm />
      </div>
    </section>
  )
}
