import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Interactive Digital Experiences | CEL3 Interactive",
  description:
    "Interactive digital experiences that guide decisions, communicate state, and convert. Not gimmicks—signals that move users through the right next step.",
};

const WHAT_THIS_IS = [
  {
    title: "Interaction as signal (not decoration)",
    desc: "Micro-feedback, motion, and layout shifts are used to reduce uncertainty and guide the next action.",
  },
  {
    title: "Clarity under complexity",
    desc: "We design experiences that make dense information feel simple—especially in dashboards, portals, and workflows.",
  },
  {
    title: "Systems thinking, applied to UX",
    desc: "The interface reflects the system: state, priority, progress, and constraints become readable at a glance.",
  },
] as const;

const DELIVERABLES = [
  "Interactive marketing sites with conversion logic (not pages)",
  "Product-led landing experiences and launch flows",
  "Interactive storytelling modules (features, benefits, proof, next-step)",
  "Client portals and onboarding experiences that reduce support load",
  "Brand motion systems (repeatable components + interaction rules)",
  "High-signal UI patterns for dashboards and internal tools",
] as const;

const BEST_FIT = [
  "You want a premium feel without sacrificing speed or clarity",
  "Your site needs to behave more like a product than a brochure",
  "You’re launching something complex and need the story to land instantly",
  "You want interaction that improves conversion and comprehension",
  "You care about performance, accessibility, and long-term maintainability",
] as const;

const FAQ = [
  {
    q: "Is this just “animations”?",
    a: "No. Animation is optional. The goal is interaction that communicates state, guides decisions, and reduces friction. Motion is used only when it improves comprehension or confidence.",
  },
  {
    q: "Does this work on mobile?",
    a: "Yes. Interactions are designed for touch with tap/press states, clear affordances, and no reliance on hover-only behaviors.",
  },
  {
    q: "What’s the typical investment?",
    a: "It depends on scope and integration needs, but most interactive experience builds start in the five-figures and scale with complexity (CMS, personalization, experiments, and platform features).",
  },
] as const;

export default function Page() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4">
          {/* Top bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Pillar • Interactive Digital Experiences
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Interaction that earns trust and moves people forward.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75">
                Not gimmicks. Not “cool effects.” Interactive digital experiences use feedback,
                motion, and adaptive layout to communicate state, reduce uncertainty, and guide the
                next right action.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/#fit"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white/15 transition-colors"
                >
                  Start a Conversation
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  View Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Built for teams ready to invest
                </span>
              </div>
            </div>

            {/* Signal badge (no custom keyframes; hover-based subtle pulse) */}
            <div className="group relative w-full lg:w-[420px] rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-5 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                  System Signal
                </div>
                <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
                  Interactive / Experience
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric label="RTT" value="24ms" />
                <Metric label="SNR" value="High" accent />
                <Metric label="STATE" value="Clear" />
              </div>

              {/* subtle sweep bar (no keyframes, just hover pulse + gradient) */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] opacity-40 group-hover:opacity-70 transition-opacity">
                <div className="h-full w-full bg-gradient-to-r from-transparent via-[rgba(var(--accent),0.55)] to-transparent animate-pulse" />
              </div>

              {/* tiny “alive” dot */}
              <div className="pointer-events-none absolute right-4 top-4 h-2 w-2 rounded-full bg-[rgb(var(--accent))] opacity-35 group-hover:opacity-70 transition-opacity animate-pulse" />
            </div>
          </div>

          {/* Body */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left rail */}
            <div className="lg:col-span-5">
              <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What this is
                </p>

                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  A high-signal interface layer.
                </h2>

                <p className="mt-4 text-white/75">
                  Interactive digital experiences turn a website into a guided system: clear state,
                  intentional feedback, and layouts that prioritize information as context changes.
                </p>

                <div className="mt-6 space-y-4">
                  {WHAT_THIS_IS.map((p) => (
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
              </section>

              <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Best-fit scenarios
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/75">
                  {BEST_FIT.map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Main content */}
            <div className="lg:col-span-7">
              <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What you get
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Deliverables built to convert and clarify.
                </h2>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DELIVERABLES.map((d) => (
                    <div
                      key={d}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75 transition-colors hover:bg-white/7"
                    >
                      <span className="text-[rgb(var(--accent))]">•</span>{" "}
                      {d}
                    </div>
                  ))}
                </div>

                {/* Subtle “Working Together” preview */}
                <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                      Working together
                    </div>
                    <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
                      low friction • high clarity
                    </div>
                  </div>

                  <ol className="mt-4 space-y-2 text-sm text-white/75">
                    <li>1) Align on outcome, audience, and constraints</li>
                    <li>2) Design interaction rules and core flow</li>
                    <li>3) Build reusable components + motion system</li>
                    <li>4) Ship fast, then iterate based on signals</li>
                  </ol>

                  {/* subtle interaction: small accent bar that brightens on hover */}
                  <div className="mt-5 h-px w-full bg-white/10 overflow-hidden rounded-full">
                    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[rgba(var(--accent),0.55)] to-transparent opacity-40 hover:opacity-70 transition-opacity" />
                  </div>
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
              <PillarLinks currentHref="/interactive-digital-experiences" />
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  If your website needs to behave like a product, let’s scope it.
                </h2>
                <p className="mt-4 text-white/75">
                  Send your goals, audience, and constraints. I’ll reply with what we’d build first,
                  how we’d measure success, and the fastest path to a high-signal v1.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link
                    href="/#fit"
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-white/15 transition-colors"
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
      <div
        className={
          accent
            ? "mt-1 text-sm text-[rgb(var(--accent))]"
            : "mt-1 text-sm text-white/85"
        }
      >
        {value}
      </div>
    </div>
  );
}
