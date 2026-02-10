import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "AI-Enhanced Systems | CEL3 Interactive",
  description:
    "Design and build intelligent systems that automate decisions, reduce manual work, and scale with your business.",
};

const PAIN_POINTS = [
  {
    title: "Manual decision bottlenecks",
    desc: "Important work stalls because decisions live in someone’s head or require constant back-and-forth.",
  },
  {
    title: "Automation that can’t adapt",
    desc: "Rule-based workflows break when inputs change, edge cases appear, or volume increases.",
  },
  {
    title: "Knowledge trapped in silos",
    desc: "Answers are buried in inboxes, docs, and chats — teams waste time searching instead of executing.",
  },
] as const;

const DELIVERABLES = [
  "AI-assisted intake + routing (with human oversight where needed)",
  "Decision support layers that surface recommendations, not noise",
  "Intelligent automation that adapts to inputs and outcomes",
  "Knowledge systems (search, summarize, classify, tag, retrieve)",
  "Guardrails, auditing, and role-based controls",
  "Integrations (APIs, CRMs, Stripe, email, forms, Zapier/Make)",
] as const;

const FAQ = [
  {
    q: "Is this just chatbots?",
    a: "No. Chat interfaces can be part of it, but the real value is embedding intelligence into your workflows: routing, classification, decision support, and automation with guardrails.",
  },
  {
    q: "Do we need a lot of data for this to work?",
    a: "Not always. Many wins come from structuring what you already have and using AI to interpret, summarize, and route. If your use case benefits from training or fine-tuning, we’ll recommend that only when it’s justified.",
  },
  {
    q: "What’s the typical investment range?",
    a: "Most AI-enhanced system builds start in the mid five-figures and scale based on complexity, integrations, permissions, and how much intelligence is embedded into core operations.",
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
                Pillar • AI-Enhanced Systems
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Embed intelligence into the systems your business already runs on.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                We don’t bolt AI onto products for novelty. We build{" "}
                <span className="text-white/90 font-medium">AI-enhanced workflows</span>{" "}
                that reduce manual work, accelerate decisions, and improve consistency —
                with guardrails and human control where it matters.
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
                  Intelligence without gimmicks
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
                  You don’t need “more AI.” You need a smarter operating system.
                </h2>

                <p className="mt-4 text-white/75">
                  AI is useful when it makes your business faster, cleaner, and more consistent —
                  not when it adds complexity. The goal is simple: reduce friction, improve
                  decisions, and automate repeatable work with safeguards.
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
                  <li>• You want intake that routes work automatically (with approval controls)</li>
                  <li>• You need faster internal decisions with consistent standards</li>
                  <li>• You want searchable knowledge across docs, tickets, or conversations</li>
                  <li>• You want automation that adapts instead of brittle “if/then” rules</li>
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
                  Systems that think, adapt, and automate — responsibly.
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
                    <li>1) Define where intelligence helps (and where it shouldn’t be used)</li>
                    <li>2) Map inputs + outputs + guardrails (accuracy, approvals, logging)</li>
                    <li>3) Ship a usable v1 (one workflow, one loop, real impact)</li>
                    <li>4) Expand into deeper automation + knowledge + decision layers</li>
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
                  If you want AI that actually improves operations, let’s scope it.
                </h2>
                <p className="mt-4 text-white/75">
                  Share your current tools, the workflows that are slowing you down, and what
                  decisions you want to speed up. I’ll reply with a build plan, timeline, and what
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
                    Clear scope • Guardrails • Real outcomes
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
