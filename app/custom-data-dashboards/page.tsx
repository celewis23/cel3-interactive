import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Custom CRMs, Dashboards & Reporting Systems | CEL3 Interactive",
  description:
    "Custom CRMs, customer records, dashboards, and reporting surfaces that turn scattered data into clear operational views your team can trust.",
};

const DEALING_WITH = [
  "Spreadsheets pretending to be CRMs",
  "Reports that require manual exports",
  "Metrics scattered across tools",
  "Customer history split between email, forms, payments, and notes",
  "Dashboards that show charts but do not drive action",
  "Owners who cannot quickly see what needs attention",
] as const;

const CAN_INCLUDE = [
  "Customer records",
  "Lead and inquiry tracking",
  "Revenue and payment visibility",
  "Booking or order status",
  "Funnel and conversion reporting",
  "Staff activity",
  "Follow-up queues",
  "Segmentation and filters",
  "AI summaries and recommendations",
] as const;

const FAQ = [
  {
    q: "Is this just charts?",
    a: "No. The real value is the interface layer and data model underneath: how customer records, payments, forms, notes, bookings, and follow-ups connect.",
  },
  {
    q: "Can you work with our existing tools?",
    a: "Yes. We can integrate with Stripe, forms, email, spreadsheets, CRMs, internal databases, and APIs where it makes sense.",
  },
  {
    q: "Where should we start?",
    a: "Start with the Digital Systems Audit so we can map your records, reporting, bottlenecks, and the first dashboard your team will actually use.",
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
                Pillar • Custom CRMs & Dashboards
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Turn scattered customer records and reporting into a dashboard your team can trust.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75 max-w-3xl">
                CEL3 builds custom CRMs, dashboards, and reporting surfaces that make the next move clear.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Audit Your Data Workflow
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  View Platform Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Built for clear records and better decisions
                </span>
              </div>
            </div>

            <SystemSignalBadge />
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  This is for teams dealing with...
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Records and reports that slow down action.
                </h2>
                <BulletGrid items={DEALING_WITH} />
              </section>

              <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  A useful dashboard reduces ambiguity.
                </h2>
                <p className="mt-4 text-white/75">
                  The goal is clarity: what is happening, why it is happening, what is stuck,
                  and what needs attention next.
                </p>
              </section>
            </div>

            <div className="lg:col-span-7">
              <section className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  What your dashboard can include
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Records, queues, reporting, and recommendations in one trusted surface.
                </h2>
                <BulletGrid items={CAN_INCLUDE} />

                <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-5">
                  <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                    Typical build flow
                  </div>
                  <ol className="mt-4 space-y-2 text-sm text-white/75">
                    <li>1. Map sources and definitions</li>
                    <li>2. Design the customer record and decision views</li>
                    <li>3. Build the first dashboard your team can use immediately</li>
                    <li>4. Add filters, permissions, automation, and deeper reporting</li>
                  </ol>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  FAQ
                </p>
                <div className="mt-5 space-y-5">
                  {FAQ.map((item) => (
                    <div key={item.q} className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-semibold text-white">{item.q}</div>
                      <div className="mt-2 text-sm text-white/75">{item.a}</div>
                    </div>
                  ))}
                </div>
              </section>

              <PillarLinks currentHref="/custom-data-dashboards" />

              <section className="mt-8 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-6">
                <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                  Next step
                </p>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Not sure what your records and reporting need? Start with a $150 Digital Systems Audit.
                </h2>
                <p className="mt-4 text-white/75">
                  We will review your current tools, reporting gaps, customer journey, and admin
                  bottlenecks before recommending what to fix, automate, or build next.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Link
                    href="/assessment"
                    className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                  >
                    Book a $150 Digital Systems Audit →
                  </Link>
                  <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                    Clear diagnosis • Practical roadmap
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
