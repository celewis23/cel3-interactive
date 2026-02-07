import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import { SystemSignalMini } from "@/components/hero/SystemSignalMini";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Custom CRM & Dashboards | CEL3 Interactive",
  description:
    "Custom CRMs and dashboards built for real workflows. Replace spreadsheets, automate follow-ups, and give your team a single source of truth.",
};

const PAIN_POINTS = [
  {
    title: "Spreadsheets as a CRM",
    desc: "Multiple versions, broken handoffs, and no real ownership of pipeline state.",
  },
  {
    title: "Tools that don’t match your workflow",
    desc: "You’re paying for features you don’t use while missing the ones you need.",
  },
  {
    title: "No visibility",
    desc: "You can’t answer simple questions: what’s stuck, what’s moving, what needs attention.",
  },
] as const;

const DELIVERABLES = [
  "Pipeline stages tailored to your process",
  "Lead capture, enrichment, and dedupe",
  "Tasking + reminders + automation triggers",
  "Role-based access + audit trails",
  "Dashboards that show true operational metrics",
  "Integrations (email, forms, Stripe, Zapier/Make, APIs)",
] as const;

const FAQ = [
  {
    q: "Do you replace HubSpot/Salesforce?",
    a: "Sometimes. If you need a lightweight system that fits your exact workflow and saves cost/complexity, custom wins. If you need enterprise features like deep attribution and massive ecosystem add-ons, we can integrate with what you already use.",
  },
  {
    q: "How fast can we ship something useful?",
    a: "Fast. We typically start with a “core loop” (capture → qualify → follow-up → status visibility), then iterate in sprints to add automation and reporting.",
  },
  {
    q: "What’s the typical investment range?",
    a: "Most custom CRM/dashboard builds start in the mid five-figures and scale based on integrations, permissions, and automation complexity.",
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
                Pillar • Custom CRM & Dashboards
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Build a CRM that matches how your business actually works.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                Generic CRMs are fine until they aren’t. If your team lives in spreadsheets,
                copy-pastes follow-ups, or can’t trust the data, a custom system turns chaos into
                clarity, and your workflow into an asset.
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
                  Projects built for teams ready to invest
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
                  You don’t need “more software.” You need a cleaner operating system.
                </h2>

                <p className="mt-4 text-white/75">
                  A custom CRM is not a vanity build. It’s a workflow engine: capture → qualify →
                  follow up → track → report. When done right, it saves hours weekly and reduces
                  dropped leads to near zero.
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
                  <li>• You have a sales pipeline and need visibility + follow-up automation</li>
                  <li>• You manage clients/projects and need a clean internal dashboard</li>
                  <li>• You want a backoffice that ties website, payments, and ops together</li>
                  <li>• You’re tired of paying monthly for tools that don’t fit</li>
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
                  Deliverables that ship, not “ideas.”
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
                    <li>1) Map your workflow and data model (what matters, what doesn’t)</li>
                    <li>2) Build the core loop and ship a usable v1</li>
                    <li>3) Add automation + permissions + reporting</li>
                    <li>4) Iterate into a full backoffice (your “ops cockpit”)</li>
                  </ol>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  FAQ
                </p>
                <div className="mt-5 space-y-5">
                  {FAQ.map((f) => (
                    <div key={f.q} className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-semibold text-white">{f.q}</div>
                      <div className="mt-2 text-sm text-white/75">{f.a}</div>
                    </div>
                  ))}
                </div>
              </section>
              <PillarLinks currentHref="/custom-crm-dashboards" />
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  If you want a CRM that feels like it belongs to your business, let’s scope it.
                </h2>
                <p className="mt-4 text-white/75">
                  Send your current process, tools, and what’s breaking. I’ll reply with a build
                  plan, timeline, and what we’d ship first.
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

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
        {label}
      </div>
      <div className={accent ? "mt-1 text-sm text-[rgb(var(--accent))]" : "mt-1 text-sm text-white/85"}>
        {value}
      </div>
    </div>
  );
}
