import SignalCard from "@/components/ui/SignalCard";

const DIFFERENTIATORS = [
  {
    title: "Website + Operations",
    desc: "The public experience connects to the backoffice, customer records, forms, content, and follow-up.",
  },
  {
    title: "Custom Admin Tools",
    desc: "Secure consoles are built around the work your staff actually needs to manage.",
  },
  {
    title: "Built Around Your Workflow",
    desc: "The platform reflects your process instead of forcing your team into a generic template.",
  },
  {
    title: "AI-Ready Architecture",
    desc: "Data, actions, and permissions are structured so AI can assist safely later.",
  },
  {
    title: "Scalable Platform Thinking",
    desc: "We plan for the next phase: commerce, booking, portals, reporting, integrations, and automation.",
  },
] as const;

export function DifferentiationSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-3xl">
        <p className="text-xs tracking-[0.25em] uppercase text-white/55">
          Difference
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
          Not another website vendor.
        </h2>
        <p className="mt-4 text-white/70">
          Most agencies stop at the public website. CEL3 builds the systems behind it,
          giving your team tools to manage the business, serve customers, and grow with
          fewer disconnected platforms.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {DIFFERENTIATORS.map((item) => (
          <SignalCard key={item.title}>
            <h3 className="text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-white/70">{item.desc}</p>
          </SignalCard>
        ))}
      </div>
    </section>
  );
}
