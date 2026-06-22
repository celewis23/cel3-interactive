import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import PillarLinks from "@/components/sections/PillarLinks";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";

export const metadata: Metadata = {
  title: "Custom Business Consoles & Operations Platforms | CEL3 Interactive",
  description:
    "Custom backoffice systems for managing customers, bookings, payments, content, staff workflows, reporting, and AI-assisted operations.",
};

const NEED_SIGNALS = [
  "Staff are jumping between too many tools",
  "Customer records are incomplete or scattered",
  "Bookings, payments, messages, and forms are disconnected",
  "Reporting requires manual exports",
  "Important follow-ups depend on memory",
  "Your business has outgrown generic dashboards",
] as const;

const CAN_MANAGE = [
  "Customers",
  "Leads and inquiries",
  "Bookings and appointments",
  "Products and orders",
  "Payments and invoices",
  "Content and pages",
  "Messages and notifications",
  "Staff roles and permissions",
  "Reports and analytics",
  "AI-assisted summaries and drafts",
] as const;

const USE_CASES = [
  {
    title: "Service businesses",
    desc: "Manage inquiries, bookings, client updates, staff handoffs, documents, and follow-up from one place.",
  },
  {
    title: "Appointment-based teams",
    desc: "Connect intake, scheduling, payments, reminders, customer records, and staff views.",
  },
  {
    title: "Commerce operations",
    desc: "Manage products, orders, payments, customer records, fulfillment states, and internal notes behind the storefront.",
  },
  {
    title: "Growing teams",
    desc: "Replace scattered spreadsheets and plugin dashboards with role-based tools staff can actually use.",
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

export default function BusinessConsolesOperationsPlatformsPage() {
  return (
    <main className="bg-black min-h-screen pt-24 md:pt-28">
      <Container>
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Capability • Business Consoles & Operations Platforms
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                The secure backoffice behind your website, customers, bookings, payments, and operations.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75">
                CEL3 builds custom business consoles for teams that need one clear place to
                manage the work behind the public website.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
                >
                  Start with a Digital Systems Audit
                </Link>

                <Link
                  href="/work"
                  className="text-sm text-white/70 transition-colors hover:text-[rgb(var(--accent))]"
                >
                  View Platform Work →
                </Link>

                <span className="text-xs tracking-[0.22em] uppercase text-white/45">
                  Built for serious daily operations
                </span>
              </div>
            </div>

            <SystemSignalBadge />
          </div>

          <section className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Why it matters
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Your public website is only useful if the operational system behind it can keep up.
              </h2>
              <p className="mt-4 text-white/75">
                A business console is the private side of your platform: the screens,
                permissions, data, workflows, and controls your team uses after customers
                interact with the public site.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                You may need a business console if...
              </h2>
              <BulletGrid items={NEED_SIGNALS} />
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Managed in one place
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              What a business console can manage
            </h2>
            <BulletGrid items={CAN_MANAGE} />
          </section>

          <section className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                Who it is for
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Businesses that need control, not just a prettier website.
              </h2>
              <p className="mt-4 text-white/75">
                This is a fit when the website needs to connect to customers, payments,
                bookings, staff tasks, documents, reporting, or communications in a way
                off-the-shelf tools do not.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {USE_CASES.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <PillarLinks currentHref="/business-consoles-operations-platforms" />

          <section className="mt-10 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Next step
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Not sure what you need? Start with a $150 Digital Systems Audit.
            </h2>
            <p className="mt-4 max-w-3xl text-white/75">
              We will map the public experience, business console, data model, workflows,
              integrations, and first useful release before a full platform is scoped.
            </p>
            <Link
              href="/assessment"
              className="mt-7 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
            >
              Book a $150 Digital Systems Audit →
            </Link>
          </section>

          <div className="h-20" />
        </div>
      </Container>
    </main>
  );
}
