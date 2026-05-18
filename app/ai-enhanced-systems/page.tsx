import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Automation & Integrations | CEL3 Interactive",
  description:
    "Practical automation, integrations, and workflow tools that reduce manual work and help businesses operate with clearer information.",
};

const PAIN_POINTS = [
  {
    title: "Manual work slows the team down",
    desc: "Staff spend too much time copying information, following up, checking statuses, or rebuilding the same reports.",
  },
  {
    title: "Tools don’t talk to each other",
    desc: "Customer details, payments, forms, email, files, and project updates live in separate places.",
  },
  {
    title: "Processes depend on memory",
    desc: "Important steps are handled differently depending on who is working, which creates missed handoffs and inconsistent service.",
  },
] as const;

const DELIVERABLES = [
  "Intake forms that route requests to the right place",
  "Customer, billing, email, file, and CRM integrations",
  "Approval workflows for tasks that still need human review",
  "Status tracking, notifications, and handoff checklists",
  "Role-based access, audit trails, and admin controls",
  "Integrations (APIs, CRMs, Stripe, email, forms, Zapier/Make)",
] as const;

const FAQ = [
  {
    q: "Is this about replacing our team?",
    a: "No. The goal is to remove avoidable admin, improve handoffs, and make important information easier to find. Your team still owns the judgment and customer relationship.",
  },
  {
    q: "Can you work with our existing tools?",
    a: "Yes. We usually start by reviewing the tools you already use, then connect or improve the parts that create the most friction.",
  },
  {
    q: "What’s the typical investment range?",
    a: "Most automation and integration projects start in the five-figure range and scale based on the number of systems, user roles, business rules, and approval requirements.",
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
                Pillar • Automation & Integrations
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Connect your tools and reduce the manual work between them.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                We build practical workflow automation and integrations that help teams
                move information, track requests, and keep customer operations organized
                without relying on scattered spreadsheets or repeated manual steps.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Start With an Assessment
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  View Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Practical workflows • Human oversight
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
                  You don’t need more tools. You need the right tools connected.
                </h2>

                <p className="mt-4 text-white/75">
                  Automation is useful when it saves time, reduces mistakes, and makes the
                  next step clear. We focus on repeatable business processes with clear rules,
                  review points, and maintainable implementation.
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
                  <li>• You want intake requests routed consistently</li>
                  <li>• You need customer, billing, file, or email data connected</li>
                  <li>• You want fewer spreadsheet handoffs and status-check messages</li>
                  <li>• You need approvals and oversight built into the process</li>
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
                  Workflows that save time without hiding the details.
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
                    <li>1) Identify the repetitive work and where errors happen</li>
                    <li>2) Map inputs, outputs, approvals, and exceptions</li>
                    <li>3) Ship one useful workflow with clear tracking</li>
                    <li>4) Expand once the process is proven in real use</li>
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

              <PillarLinks currentHref="/ai-enhanced-systems" />

              <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  If your tools are creating extra work, let’s scope the fix.
                </h2>
                <p className="mt-4 text-white/75">
                  Share your current tools, the workflows that are slowing you down, and what
                  handoffs you want to improve. I’ll reply with a build plan, timeline, and what
                  we’d ship first.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link
                    href="/assessment"
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                  >
                    Book an Assessment →
                  </Link>
                  <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                    Clear scope • Practical safeguards • Real operations
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
