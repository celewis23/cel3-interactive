import { Section } from "../layout/Section";

export function InteractiveByDesign() {
  return (
    <Section
      id="approach"
      eyebrow="Approach"
      title="Interactive by Design"
      subtitle="We don’t design pages. We design systems that adapt. Behavior drives the experience."
      variant="tight"
    >
      {/* Placeholder for future keyword highlight interactions */}
      <div className="max-w-3xl text-white/65">
        <ul className="grid gap-3 md:grid-cols-3">
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/85 font-medium">Respond</p>
            <p className="mt-2 text-sm">Interfaces that acknowledge intent.</p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/85 font-medium">Adapt</p>
            <p className="mt-2 text-sm">Layouts that shift with context.</p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/85 font-medium">Evolve</p>
            <p className="mt-2 text-sm">Systems built for long-term change.</p>
          </li>
        </ul>
      </div>
    </Section>
  );
}
