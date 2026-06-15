import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import PillarLinks from "@/components/sections/PillarLinks";
import SystemSignalBadge from "@/components/ui/SystemSignalBadge";

export const metadata: Metadata = {
  title: "Business Consoles & Operations Platforms | CEL3 Interactive",
  description:
    "Secure business consoles, admin platforms, client portals, ecommerce management, booking systems, communication hubs, analytics, and AI-ready operations tools.",
};

const FEATURES = [
  "Customer management",
  "Product management",
  "Order management",
  "Booking management",
  "Content management",
  "Staff roles and permissions",
  "Communication center",
  "Reports and analytics",
  "AI assistant tools",
  "Secure settings and integrations",
] as const;

const USE_CASES = [
  {
    title: "Service businesses",
    desc: "Manage inquiries, bookings, client updates, staff handoffs, documents, and follow-up from one place.",
  },
  {
    title: "Commerce operations",
    desc: "Manage products, orders, payments, customer records, fulfillment states, and internal notes behind the storefront.",
  },
  {
    title: "Content-heavy organizations",
    desc: "Update public pages, campaigns, assets, announcements, forms, and customer communications without developer bottlenecks.",
  },
  {
    title: "Growing teams",
    desc: "Replace scattered spreadsheets and plugin dashboards with role-based tools staff can actually use.",
  },
] as const;

const CONSOLE_AREAS = [
  "CRM and customer history",
  "Ecommerce and product operations",
  "Booking and appointment workflows",
  "Email, SMS, and message centers",
  "Forms, intake, and onboarding",
  "CMS and content publishing",
  "Dashboards and reporting",
  "AI-assisted summaries and drafts",
] as const;

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
                The secure backoffice behind your website, customers, commerce, and operations.
              </h1>

              <p className="mt-5 text-base md:text-lg text-white/75">
                Public websites are only one part of the system. CEL3 builds the business console
                behind them: a secure place to manage customers, products, bookings, content,
                communication, reporting, staff workflows, and AI-assisted operations.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
                >
                  Start a Discovery Assessment
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
                What is a business console?
              </p>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                A custom operating surface for the parts of your business that generic tools do not handle well.
              </h2>
              <p className="mt-4 text-white/75">
                It is the private side of your platform: the screens, permissions, data, workflows,
                and controls your team uses to run the business after customers interact with the public site.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">
                What it can include
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((feature) => (
                  <div key={feature} className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/75">
                    <span className="text-[rgb(var(--accent))]">•</span> {feature}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Better than disconnected plugins
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              One business surface instead of ten partial dashboards.
            </h2>
            <p className="mt-4 max-w-4xl text-white/75">
              Plugins can help with isolated tasks, but they often leave staff bouncing between tools,
              copying information, and guessing what changed. A custom business console gives your
              operation a single, secure interface for the information and actions that matter most.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CONSOLE_AREAS.map((area) => (
                <div key={area} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                  {area}
                </div>
              ))}
            </div>
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
                This is a fit when the website needs to connect to customers, payments, bookings,
                staff tasks, documents, reporting, or communications in a way off-the-shelf tools do not.
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

          <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Next step
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Plan the platform your team will actually run.
            </h2>
            <p className="mt-4 max-w-3xl text-white/75">
              Start with a discovery assessment. We will map the public experience, business console,
              data model, workflows, integrations, and first useful release.
            </p>
            <Link
              href="/assessment"
              className="mt-7 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:bg-[rgb(var(--accent))]/100"
            >
              Plan Your Business Platform →
            </Link>
          </section>

          <div className="h-20" />
        </div>
      </Container>
    </main>
  );
}
