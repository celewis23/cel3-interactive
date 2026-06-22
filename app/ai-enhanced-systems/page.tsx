import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "AI-Assisted Workflows & Operations Systems | CEL3 Interactive",
  description:
    "Practical AI-assisted workflows that help teams summarize, draft, route, follow up, and report faster while keeping important actions human-approved.",
};

const USE_CASES = [
  "Draft customer replies for review",
  "Summarize customer history",
  "Recommend follow-ups",
  "Turn form submissions into structured records",
  "Generate internal notes or task summaries",
  "Draft product descriptions or content updates",
  "Flag stalled leads, bookings, or requests",
  "Summarize reports and operational activity",
] as const;

const AVOID = [
  "AI hype without a workflow",
  "Fully automated customer actions without review",
  "Black-box decisions",
  "Replacing judgment with unreliable shortcuts",
  "Tools that create more admin than they remove",
] as const;

const PRINCIPLES = [
  {
    title: "Human approval stays visible",
    desc: "Important customer-facing actions should be drafted, reviewed, and tracked instead of blindly sent.",
  },
  {
    title: "AI needs connected context",
    desc: "Useful assistance depends on clean records, permissions, status, and workflow state.",
  },
  {
    title: "Start with one real bottleneck",
    desc: "The right first AI workflow is usually a narrow admin task that repeats often and slows people down.",
  },
] as const;

function BulletGrid({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <span className="text-[rgb(var(--accent))]">•</span> {item}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Pillar • AI-Enhanced Systems
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                AI-assisted workflows that reduce admin without giving up control.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                CEL3 builds AI-enhanced systems that help your team summarize, draft, route,
                follow up, and report faster while keeping important actions reviewable and
                human-approved.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Find AI Opportunities in Your Workflow
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  View Platform Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Assistive AI • Reviewable actions • Real operations
                </span>
              </div>
            </div>

            <SystemSignalBadge />
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Practical AI use cases
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Use AI where it reduces real admin work.
                </h2>
                <BulletGrid items={USE_CASES} />
              </section>

              <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  AI only helps when the workflow is clear.
                </h2>
                <p className="mt-4 text-white/75">
                  Good AI systems need clean records, defined actions, review states, and
                  guardrails. Otherwise they create another disconnected tool to manage.
                </p>
              </section>
            </div>

            <div className="lg:col-span-7">
              <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What we avoid
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Practical automation, not AI theater.
                </h2>
                <BulletGrid items={AVOID} />
              </section>

              <section className="mt-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  How we design it
                </p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRINCIPLES.map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm text-white/70">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-5">
                  <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                    Typical build flow
                  </div>
                  <ol className="mt-4 space-y-2 text-sm text-white/75">
                    <li>1. Identify repetitive admin and context gaps</li>
                    <li>2. Map records, permissions, approvals, and exceptions</li>
                    <li>3. Ship one assistive workflow with clear review states</li>
                    <li>4. Expand once the process is proven in real use</li>
                  </ol>
                </div>
              </section>

              <PillarLinks currentHref="/ai-enhanced-systems" />

              <section className="mt-8 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Not sure where AI belongs? Start with a $150 Digital Systems Audit.
                </h2>
                <p className="mt-4 text-white/75">
                  We will review your tools, workflows, customer journey, and admin bottlenecks
                  to find practical AI opportunities with human control built in.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link
                    href="/assessment"
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                  >
                    Book a $150 Digital Systems Audit →
                  </Link>
                  <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                    Clear scope • Practical safeguards
                  </span>
                </div>
              </section>
            </div>
          </div>

          <div className="h-20" />
        </div>
      </Container>
    </main>
  );
}
