import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import PillarLinks from "@/components/sections/PillarLinks";

export const metadata: Metadata = {
  title: "Custom Web Applications & Business Platforms | CEL3 Interactive",
  description:
    "Custom portals, dashboards, ecommerce systems, booking flows, internal tools, and workflow platforms for companies that off-the-shelf software does not fit.",
};

const WHAT_WE_BUILD = [
  {
    title: "Client portals",
    desc: "Account experiences where customers can view projects, files, messages, invoices, requests, and status.",
  },
  {
    title: "Business dashboards",
    desc: "Internal views for records, requests, operations, reporting, and staff work.",
  },
  {
    title: "Ecommerce systems",
    desc: "Storefronts, checkout, product management, order workflows, and internal commerce controls.",
  },
  {
    title: "Booking flows",
    desc: "Scheduling, intake, appointment management, staff views, reminders, and customer follow-up.",
  },
  {
    title: "Internal tools",
    desc: "Role-based systems for the work your team currently handles in spreadsheets, inboxes, and plugin dashboards.",
  },
  {
    title: "Workflow platforms",
    desc: "Connected tools that bring payments, forms, messages, content, and customer history into one operating model.",
  },
] as const;

const WHEN_CUSTOM = [
  "You have multiple user roles or permissions",
  "Your workflow does not fit a generic SaaS tool",
  "Customers need a portal or account experience",
  "Staff need a better internal dashboard",
  "Payments, bookings, forms, or messages need to connect",
  "You need one source of truth across tools",
] as const;

const PRINCIPLES = [
  {
    title: "Map the workflow first",
    desc: "We define the real customer, staff, data, and payment flow before designing screens.",
  },
  {
    title: "Ship the core loop",
    desc: "The first release should solve a real operational problem, not just look complete.",
  },
  {
    title: "Make state visible",
    desc: "Good platforms show what is new, stuck, paid, booked, waiting, assigned, or ready for review.",
  },
  {
    title: "Build for change",
    desc: "The system should evolve as the business changes without becoming fragile.",
  },
] as const;

export default function CustomWebApplicationsPage() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <section className="max-w-3xl">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Pillar • Custom Web Applications
            </p>

            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Custom web applications built around how your business actually works.
            </h1>

            <p className="mt-5 text-base md:text-lg text-white/75">
              CEL3 designs and builds portals, dashboards, ecommerce systems, booking flows,
              internal tools, and workflow platforms for companies that off-the-shelf software
              does not fit.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/assessment"
                className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
              >
                Plan Your Platform
              </Link>

              <Link
                href="/work"
                className="text-sm text-white/70 hover:text-[rgb(var(--accent))]/100 transition-colors"
              >
                View Platform Work →
              </Link>

              <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                Built when software needs to fit the operation
              </span>
            </div>
          </section>

          <section className="mt-14 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              What we build
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Platforms for the work that happens after someone lands on your site.
            </h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WHAT_WE_BUILD.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm text-white/70">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                When custom makes sense
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Custom is useful when a generic tool bends the business in the wrong direction.
              </h2>
              <p className="mt-4 text-white/75">
                Not every business needs custom software. It becomes the right choice when
                customer experience, staff workflow, payments, records, and reporting need to
                work together in a specific way.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/75">
                {WHEN_CUSTOM.map((item) => (
                  <li key={item} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <span className="text-[rgb(var(--accent))]">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              How we approach it
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Build the operating model before the interface gets expensive.
            </h2>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRINCIPLES.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm text-white/70">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <PillarLinks currentHref="/custom-web-applications" />

          <section className="mt-12 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-7">
            <div className="max-w-3xl">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Next step
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Not sure what to build first? Start with a $150 Digital Systems Audit.
              </h2>
              <p className="mt-4 text-white/75">
                We will map your current website, customer journey, tools, workflows, data, and
                bottlenecks before a full custom platform is scoped.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors"
                >
                  Book a $150 Digital Systems Audit →
                </Link>
                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Practical scope • Clear first release
                </span>
              </div>
            </div>
          </section>

          <div className="h-16" />
        </div>
      </Container>
    </main>
  );
}
