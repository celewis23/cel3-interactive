import InteractiveCard from "@/components/ui/InteractiveCard";

export default function InteractiveByDesign() {
  return (
    <section id="capabilities" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">
            Interactive by design
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Interfaces that feel alive
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Not animation for animation’s sake. Systems that respond to intent, adapt to context,
            and communicate state with clarity.
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <InteractiveCard
          variant="respond"
          eyebrow="Respond"
          title="Design that reacts to intent"
          desc="Hover, scroll, and input become signals. The UI acknowledges the user and guides the next move."
          footLeft="Intent"
          footRight="Locked"
        />

        <InteractiveCard
          variant="adapt"
          eyebrow="Adapt"
          title="Layouts that reflow intelligently"
          desc="Components shift like a living grid. Information prioritizes itself as context changes."
          footLeft="Grid"
          footRight="Reflow"
        />

        <InteractiveCard
          variant="evolve"
          eyebrow="Evolve"
          title="Systems that communicate state"
          desc="Micro-metrics, health indicators, and quiet motion make complex platforms feel simple."
          footLeft="Status"
          footRight="Stable"
        />
      </div>
    </section>
  );
}
