import { Section } from "../layout/Section";

export function FitCTA() {
  return (
    <Section
      id="fit"
      eyebrow="Next"
      title="If this feels aligned, we should talk."
      variant="tight"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="#fit-flow"
          className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-white/10 transition-colors"
        >
          Let’s See If We’re a Fit
        </a>
        <a
          href="#work"
          className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/70 hover:text-white transition-colors"
        >
          Review Work
        </a>
      </div>
    </Section>
  );
}
