type Feature = {
  label: string
  description: string
}

const FEATURES: Feature[] = [
  {
    label: 'Reads the page, not just the URL',
    description:
      'A streaming scrape-and-analyze pipeline pulls the positioning, audience, and tone — so the sequence sounds like the page it came from.',
  },
  {
    label: 'Five emails, one prompt',
    description:
      'Welcome, story, social proof, objection, close. Edit any of them; the rest stay coherent.',
  },
  {
    label: 'Editor that gets out of the way',
    description:
      'A clean rich-text editor with version history. Auto-save by default. No surprise modals.',
  },
  {
    label: 'Built on GPT-5',
    description:
      'The latest reasoning model — better hooks, sharper subject lines, fewer apologies.',
  },
  {
    label: 'Bring your own ESP',
    description:
      'Copy and paste straight into Mailchimp, ConvertKit, Beehiiv, or whatever you already use.',
  },
  {
    label: 'No signup to try',
    description: 'Paste a URL and you have a draft sequence. Sign up only if you want to keep it.',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-label="Features"
      className="py-24 md:py-32"
    >
      {/* Lead feature */}
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center mb-24 md:mb-32">
        <div>
          <p className="text-sm font-medium text-primary mb-4 tracking-tight">Generation</p>
          <h2 className="text-display text-3xl md:text-5xl text-foreground mb-6">
            A sequence that sounds like your landing page — because it read it.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Most AI email tools start from a blank prompt. Flashletter starts from your page. It
            scrapes the headline, the hooks, the audience signals, and the tone — then writes a
            five-email launch sequence you can actually send.
          </p>
        </div>

        {/* Faux analysis card */}
        <div
          className="relative rounded-xl border border-border bg-card p-6 md:p-7"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Analysis
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular">stripe.com</span>
          </div>

          <dl className="space-y-4">
            {[
              { k: 'Audience', v: 'Engineers and founders integrating payments' },
              { k: 'Positioning', v: 'Infrastructure, not a checkout widget' },
              { k: 'Tone', v: 'Confident, technical, restrained' },
              { k: 'Top hook', v: 'Ship a global business in days, not quarters' },
            ].map(({ k, v }) => (
              <div
                key={k}
                className="grid grid-cols-[8rem_1fr] gap-4 items-baseline"
              >
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Generating sequence…</span>
            <span className="font-mono text-xs text-primary tabular">3 / 5</span>
          </div>
        </div>
      </div>

      {/* Supporting features */}
      <div className="border-t border-border">
        <dl className="grid md:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.label}
              className={`
                py-8 md:py-10 px-0 md:px-8
                border-b border-border
                ${i % 2 === 0 ? 'md:border-r' : ''}
              `}
            >
              <dt className="text-base font-semibold text-foreground mb-2 tracking-tight">
                {feature.label}
              </dt>
              <dd className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
