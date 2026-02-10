import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Data & Intelligent Interfaces | CEL3 Interactive",
  description:
    "Data-driven interfaces and dashboards that turn raw information into clarity, action, and insight — built for real workflows and decision-making.",
};

const PAIN_POINTS = [
  {
    title: "Data scattered across tools",
    desc: "Metrics live in different places, definitions don’t match, and nobody trusts the numbers.",
  },
  {
    title: "Dashboards that don’t drive action",
    desc: "Charts look nice, but they don’t answer what to do next or what needs attention.",
  },
  {
    title: "Slow visibility and manual reporting",
    desc: "You’re exporting CSVs, copying into spreadsheets, and rebuilding the same view every week.",
  },
] as const;

const DELIVERABLES = [
  "A unified data model (what matters, how it’s defined)",
  "Dashboards designed for decisions, not decoration",
  "Interactive filters, drilldowns, and “why” views",
  "Role-based views (owners, ops, sales, finance, support)",
  "Event + funnel visibility (what’s happening and where it breaks)",
  "Integrations (Stripe, forms, email, databases, APIs, Zapier/Make)",
] as const;

const FAQ = [
  {
    q: "Is this just dashboards?",
    a: "No. The real value is the interface layer and data model underneath. We design how data is defined, connected, and presented so your team can interpret it quickly and take action.",
  },
  {
    q: "Can you work with our existing tools and data sources?",
    a: "Yes. We can integrate with what you already use (Stripe, Google Sheets, forms, CRMs, internal databases, APIs) and create a clean, reliable view on top — or rebuild parts that are slowing you down.",
  },
  {
    q: "What’s the typical investment range?",
    a: "Most data + intelligent interface builds start in the mid five-figures and scale based on the number of sources, the complexity of the model, and the level of interactivity, permissions, and automation.",
  },
] as const;

export default function Page() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4">
          {/* Top bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Pillar • Data & Intelligent Interfaces
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Turn raw data into clarity your team can actually use.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                Most businesses don’t have a “data problem” — they have a{" "}
                <span className="text-white/90 font-medium">visibility</span>{" "}
                problem. When metrics are scattered, definitions change, and reporting is manual,
                decisions get slower and execution gets messy. We build data-driven interfaces that
                make the truth obvious and the next move clear.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/#fit"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Start a Conversation
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  View Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Interfaces built for speed + decisions
                </span>
              </div>
            </div>

            {/* Subtle “signal” badge */}
            <SystemSignalBadge />
          </div>

          {/* Body */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left rail */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  The problem
                </p>

                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  You don’t need more reports. You need a sharper decision surface.
                </h2>

                <p className="mt-4 text-white/75">
                  A great interface doesn’t just display data — it{" "}
                  <span className="text-white/90 font-medium">reduces ambiguity</span>.
                  The goal is clarity: what’s happening, why it’s happening, what’s stuck, and what
                  should happen next.
                </p>

                <div className="mt-6 space-y-4">
                  {PAIN_POINTS.map((p) => (
                    <div
                      key={p.title}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="text-sm font-semibold text-white">
                        {p.title}
                      </div>
                      <div className="mt-1 text-sm text-white/70">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Best-fit scenarios
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/75">
                  <li>• You need one source of truth across tools and teams</li>
                  <li>• You want dashboards that explain what matters (not just charts)</li>
                  <li>• You need drilldowns, segmentation, and role-based visibility</li>
                  <li>• You’re tired of manual reporting and “CSV workflows”</li>
                </ul>
              </div>
            </div>

            {/* Main content */}
            <div className="lg:col-span-7">
              <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What you get
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Interfaces that make the next move obvious.
                </h2>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DELIVERABLES.map((d) => (
                    <div
                      key={d}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75"
                    >
                      <span className="text-[rgb(var(--accent))]">•</span>{" "}
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-5">
                  <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                    Typical build flow
                  </div>
                  <ol className="mt-4 space-y-2 text-sm text-white/75">
                    <li>1) Map sources + definitions (what’s true, what’s noisy)</li>
                    <li>2) Design the interface model (views, drilldowns, decisions)</li>
                    <li>3) Build the v1 dashboard layer and ship a usable release</li>
                    <li>4) Add segmentation, permissions, automation, and deeper insight</li>
                  </ol>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  FAQ
                </p>
                <div className="mt-5 space-y-5">
                  {FAQ.map((f) => (
                    <div
                      key={f.q}
                      className="rounded-xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="text-sm font-semibold text-white">
                        {f.q}
                      </div>
                      <div className="mt-2 text-sm text-white/75">{f.a}</div>
                    </div>
                  ))}
                </div>
              </section>

              <PillarLinks currentHref="/data-intelligent-interfaces" />

              <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  If you want visibility you can trust, let’s scope it.
                </h2>
                <p className="mt-4 text-white/75">
                  Share your current tools, the metrics you care about, and what you wish you could
                  see instantly. I’ll reply with a build plan, timeline, and what we’d ship first.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link
                    href="/#fit"
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                  >
                    Send Fit Request →
                  </Link>
                  <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                    Fast response • Clear next steps
                  </span>
                </div>
              </section>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-20" />
        </div>
      </Container>
    </main>
  );
}
