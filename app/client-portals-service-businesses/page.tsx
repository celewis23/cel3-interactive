import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Client Portals & Business Platforms for Service Businesses | CEL3 Interactive",
  description:
    "Client portals, booking flows, dashboards, payment workflows, customer records, and AI-assisted admin tools for service businesses with disconnected operations.",
};

const BUSINESS_TYPES = [
  "Wellness studios",
  "Clinics",
  "Consultants",
  "Agencies",
  "Coaches",
  "Appointment-based businesses",
  "Local service companies",
  "Membership businesses",
] as const;

const BUILDS = [
  "Client portals",
  "Booking and intake flows",
  "Stripe payment workflows",
  "Customer records",
  "Staff dashboards",
  "Follow-up systems",
  "Membership or package management",
  "Document/file sharing",
  "Email/SMS notification workflows",
  "Reporting dashboards",
  "AI-assisted admin tools",
] as const;

const PROBLEMS = [
  "Too many tools",
  "Manual follow-up",
  "Missed customer details",
  "No single customer record",
  "Messy booking/payment process",
  "No visibility into what needs attention",
  "Staff depending on memory or spreadsheets",
] as const;

function BulletGrid({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <span className="text-[rgb(var(--accent))]">•</span> {item}
        </div>
      ))}
    </div>
  );
}

export default function ClientPortalsServiceBusinessesPage() {
  return (
    <main className="min-h-screen bg-black pt-24 text-white md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <section className="max-w-4xl">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Service Business Platforms
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Client portals, booking flows, dashboards, and business systems for service businesses.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
              CEL3 helps service businesses replace scattered forms, bookings, payments,
              emails, spreadsheets, and customer records with clearer digital systems.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/assessment"
                className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
              >
                Book a $150 Digital Systems Audit
              </Link>
              <Link
                href="/work"
                className="text-sm text-white/70 transition-colors hover:text-[rgb(var(--accent))]"
              >
                View Platform Work →
              </Link>
            </div>
          </section>

          <section className="mt-14 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Built for service businesses that need clearer operations
            </p>
            <BulletGrid items={BUSINESS_TYPES} />
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              What we can build
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              The operational layer behind your website and customer journey.
            </h2>
            <BulletGrid items={BUILDS} />
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Common problems we solve
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Replace scattered admin with a clearer system.
            </h2>
            <BulletGrid items={PROBLEMS} />
          </section>

          <section className="mt-10 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-6">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Start with a Systems Audit.
            </h2>
            <p className="mt-4 max-w-3xl text-white/75">
              Before scoping a portal, dashboard, booking flow, payment workflow, or AI-assisted
              admin tool, we map what is slowing the business down and what should be fixed first.
            </p>
            <Link
              href="/assessment"
              className="mt-7 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
            >
              Start with a Systems Audit →
            </Link>
          </section>
        </div>
      </Container>
    </main>
  );
}
