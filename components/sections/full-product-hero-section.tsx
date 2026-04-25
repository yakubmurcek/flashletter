import { HeroUrlForm } from '@/components/sections/hero-url-form'

export function FullProductHeroSection() {
  return (
    <section className="pt-24 md:pt-32 pb-20 md:pb-28">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-medium text-muted-foreground mb-6 tracking-tight">
          For founders who hate writing from scratch
        </p>

        <h1 className="text-display text-5xl md:text-7xl text-foreground mb-6">
          Turn your landing page into a <span className="text-primary">newsletter campaign</span> in
          30 seconds.
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop staring at a blank editor. Your first converting email campaign is ready to send.
        </p>

        <HeroUrlForm />
      </div>

      {/* Product canvas placeholder — replace with real editor screenshot */}
      <div
        className="mt-20 md:mt-24 max-w-5xl mx-auto px-4"
        aria-hidden="true"
      >
        <div
          className="
            relative rounded-xl border border-border
            bg-card overflow-hidden
            shadow-[0_30px_80px_-30px_oklch(0.18_0.012_60_/_0.18)]
          "
        >
          {/* Window chrome */}
          <div className="h-9 border-b border-border bg-background/80 flex items-center gap-1.5 px-4">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="ml-3 text-xs text-muted-foreground tabular">
              flashletter / launch sequence
            </span>
          </div>

          <div className="grid grid-cols-[200px_1fr] md:grid-cols-[240px_1fr] min-h-[420px] md:min-h-[480px]">
            {/* Sidebar — email list */}
            <aside className="border-r border-border bg-background/40 py-4 text-left">
              <div className="px-4 pb-3 text-xs uppercase tracking-widest text-muted-foreground">
                5 emails
              </div>
              {[
                { n: 1, label: 'Welcome', sub: 'You’re in.', active: true },
                { n: 2, label: 'Story', sub: 'Why we built this' },
                { n: 3, label: 'Social proof', sub: 'What customers say' },
                { n: 4, label: 'Objection', sub: 'But what about…' },
                { n: 5, label: 'Close', sub: 'Last chance' },
              ].map((item) => (
                <div
                  key={item.n}
                  className={`
                    px-4 py-2.5 flex items-baseline gap-3 border-l-2
                    ${item.active ? 'border-l-primary bg-primary/5' : 'border-l-transparent'}
                  `}
                >
                  <span className="font-mono text-xs text-muted-foreground tabular w-3">
                    {item.n}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm leading-tight truncate ${
                        item.active ? 'text-foreground font-medium' : 'text-foreground/80'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{item.sub}</div>
                  </div>
                </div>
              ))}
            </aside>

            {/* Main — email content */}
            <div className="px-6 md:px-10 py-7 text-left flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Email 1 of 5 · Welcome
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular">Auto-saved</span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="text-base font-medium text-foreground">
                  You&rsquo;re in. Here&rsquo;s what happens next.
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="h-3 w-[42%] bg-muted rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-[94%] bg-muted rounded" />
                  <div className="h-3 w-[88%] bg-muted rounded" />
                  <div className="h-3 w-[72%] bg-muted rounded" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-[90%] bg-muted rounded" />
                  <div className="h-3 w-[55%] bg-muted rounded" />
                </div>

                <div className="pt-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                    Read the launch story
                  </div>
                </div>

                <div className="space-y-2 pt-3">
                  <div className="h-3 w-[60%] bg-muted rounded" />
                  <div className="h-3 w-[35%] bg-muted rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
