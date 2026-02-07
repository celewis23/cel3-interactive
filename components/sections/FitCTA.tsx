import { Section } from "../layout/Section";

export function FitCTA() {
  return (
    <Section
      id="fitCTA"
      eyebrow="Next"
      title="If this feels aligned, we should talk."
      variant="tight"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/#fit"
          className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 hover:border-[rgb(var(--accent))]/100 transition-colors"
        >
          Let’s See If We’re a Fit
        </a>
        <a
          href="#work"
          className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/70 hover:text-[rgb(var(--accent))]/100 hover:bg-[rgb(var(--accent))]/10 transition-colors"
        >
          Review Work
        </a>
      </div>
    </Section>
  );
}
