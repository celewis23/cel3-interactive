import SignalCard from "@/components/ui/SignalCard";

export default function WorkingTogether() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-3xl">
        <p className="text-xs tracking-[0.25em] uppercase text-white/55">
          Working together
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
          A clear, collaborative process
        </h2>
        <p className="mt-4 text-white/70">
          Every engagement is structured to reduce risk, clarify scope,
          and build practical systems your team can actually use.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <SignalCard>
          <h3 className="text-lg font-semibold">01. Discovery</h3>
          <p className="mt-2 text-sm text-white/70">
            We review your goals, current tools, users, and constraints before recommending a build.
          </p>
        </SignalCard>

        <SignalCard>
          <h3 className="text-lg font-semibold">02. Design & Build</h3>
          <p className="mt-2 text-sm text-white/70">
            We design the workflow and build the technical foundation together.
          </p>
        </SignalCard>

        <SignalCard>
          <h3 className="text-lg font-semibold">03. Launch & Evolve</h3>
          <p className="mt-2 text-sm text-white/70">
            We launch the first useful version, then refine based on real use and business needs.
          </p>
        </SignalCard>
      </div>
    </section>
  );
}
