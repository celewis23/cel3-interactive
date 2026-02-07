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
          and build systems that can evolve.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <SignalCard>
          <h3 className="text-lg font-semibold">01. Discovery</h3>
          <p className="mt-2 text-sm text-white/70">
            We define the system, users, and constraints before design begins.
          </p>
        </SignalCard>

        <SignalCard>
          <h3 className="text-lg font-semibold">02. Design & Build</h3>
          <p className="mt-2 text-sm text-white/70">
            Interfaces are designed alongside the underlying architecture.
          </p>
        </SignalCard>

        <SignalCard>
          <h3 className="text-lg font-semibold">03. Launch & Evolve</h3>
          <p className="mt-2 text-sm text-white/70">
            Systems are shipped cleanly and refined as real usage emerges.
          </p>
        </SignalCard>
      </div>
    </section>
  );
}
