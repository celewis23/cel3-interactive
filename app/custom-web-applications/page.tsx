import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Custom Web Applications & Interactive Platforms | CEL3 Interactive",
  description:
    "We design and build custom web applications, interactive websites, dashboards, and internal systems for teams that need scalable, adaptive platforms.",
};

const WHAT_WE_BUILD = [
  {
    title: "Custom web applications",
    desc: "Purpose-built apps with real workflows, real states, and clean UX for daily use.",
  },
  {
    title: "Dashboards + admin panels",
    desc: "Operational visibility, role-based views, and interfaces that reduce noise.",
  },
  {
    title: "Interactive websites",
    desc: "High-signal marketing sites that guide action and communicate value through feedback.",
  },
  {
    title: "Workflow + internal systems",
    desc: "Replace manual handoffs with systems that enforce process and keep teams aligned.",
  },
  {
    title: "Custom CRMs",
    desc: "If generic tools don’t fit, we build a CRM that matches how you actually run ops.",
  },
  {
    title: "E-commerce beyond templates",
    desc: "When storefronts aren’t enough: catalogs, portals, pricing rules, automation, and more.",
  },
] as const;

const WHEN_CUSTOM = [
  "You have multiple user roles and workflows that don’t fit off-the-shelf tools",
  "You need clarity inside data-heavy screens (not clutter)",
  "Your platform must evolve without becoming fragile",
  "You’re integrating systems (payments, email, CRM, internal tools) and need one source of truth",
] as const;

const PRINCIPLES = [
  {
    title: "Structure first",
    desc: "We map workflows and data before polishing UI. That’s how platforms stay durable.",
  },
  {
    title: "State is visible",
    desc: "Interfaces should show what’s happening: progress, health, next actions, and outcomes.",
  },
  {
    title: "Interaction is signal",
    desc: "Motion and feedback exist to reduce friction and guide decisions, not decorate screens.",
  },
  {
    title: "Ship usable increments",
    desc: "We build a core loop first, then expand. You get value early, then we iterate.",
  },
] as const;

export default function CustomWebApplicationsPage() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4 pb-20">
          {/* HERO */}
          <section className="max-w-3xl">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Pillar • Custom Web Applications
            </p>

            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Custom web applications and interactive platforms
            </h1>

            <p className="mt-5 text-base md:text-lg text-white/75">
              CEL3 Interactive designs and builds custom web applications, interactive websites,
              dashboards, and internal systems for teams who need more than templates.
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
                className="text-sm text-white/70 hover:text-[rgb(var(--accent))]/100 transition-colors"
              >
                View Work →
              </Link>

              <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                Built for teams ready to invest
              </span>
            </div>
          </section>

          {/* WHAT WE BUILD */}
          <section className="mt-14 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What we build
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Systems that feel clear, alive, and operational.
                </h2>
                <p className="mt-4 text-white/75 max-w-3xl">
                  We work with businesses that have outgrown static sites and off-the-shelf tools.
                  Our projects are built when interaction, data flow, and system clarity matter.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WHAT_WE_BUILD.map((i) => (
                <div
                  key={i.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-sm font-semibold text-white">{i.title}</div>
                  <div className="mt-2 text-sm text-white/70">{i.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* WHEN CUSTOM MAKES SENSE */}
          <section className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                When custom makes sense
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Not everything needs custom.
              </h2>
              <p className="mt-4 text-white/75">
                Custom development becomes the right choice when your business requires systems
                that adapt to context instead of forcing users into fixed flows.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                Good signals
              </div>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                {WHEN_CUSTOM.map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="text-[rgb(var(--accent))] mt-[2px]">•</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* INTERACTIVE BY DESIGN */}
          <section className="mt-10 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Interactive by design
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Interaction isn’t decoration. It’s communication.
            </h2>
            <p className="mt-4 text-white/75 max-w-4xl">
              Motion and feedback are used to communicate state, guide decisions, and reduce friction.
              In dashboards, CRMs, and operational tools, clarity beats raw data volume.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRINCIPLES.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-sm font-semibold text-white">{p.title}</div>
                  <div className="mt-2 text-sm text-white/70">{p.desc}</div>
                </div>
              ))}
            </div>
          </section>
          <PillarLinks currentHref="/custom-web-applications" />
          {/* CTA */}
          <section className="mt-12 relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-7">
            <div className="max-w-3xl">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Next step
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Start with clarity, then ship.
              </h2>
              <p className="mt-4 text-white/75">
                If you’re exploring a custom web application, interactive platform, or internal system,
                send your scope and constraints. You’ll get a clear reply with next steps and what we’d ship first.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/#fit"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Send Fit Request →
                </Link>
                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Fast response • Clear direction
                </span>
              </div>
            </div>

            {/* subtle sweep (no styled-jsx) */}
            <div className="pointer-events-none absolute inset-y-0 -left-24 w-24 opacity-60 animate-[pillarSweep_3.2s_linear_infinite]">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(var(--accent),0.45), transparent)",
                }}
              />
            </div>
          </section>

          <div className="h-16" />
        </div>
      </Container>
    </main>
  );
}
