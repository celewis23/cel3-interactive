import Link from "next/link";
import AssessmentPaymentCard from "@/components/assessment/AssessmentPayCard";

export const metadata = {
  title: "Digital Systems Audit | CEL3 Interactive",
  description:
    "Book a $150 Digital Systems Audit to review your website, tools, workflows, customer journey, admin bottlenecks, and opportunities for automation or custom platform development.",
};

const REVIEW_ITEMS = [
  "Your current website and customer journey",
  "Forms, booking, payment, and intake flows",
  "Customer records and follow-up process",
  "Internal admin tools and spreadsheets",
  "Current software, plugins, and automations",
  "Reporting and visibility gaps",
  "Opportunities for portals, dashboards, or AI-assisted workflows",
] as const;

const LEAVE_WITH = [
  "Clear diagnosis of what is slowing things down",
  "Practical recommendations",
  "Build/no-build guidance",
  "Suggested platform roadmap",
  "Priority list of quick wins and larger improvements",
  "Next-step scope if a custom build makes sense",
] as const;

const WHO_FOR = [
  "Business owners and founders",
  "Service businesses with manual admin",
  "Teams using too many disconnected tools",
  "Companies planning a new website or client portal",
  "Businesses that need better dashboards, bookings, payments, or customer workflows",
  "Teams interested in practical AI support",
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

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="space-y-4">
          <Link href="/" className="text-sm text-white/35 transition-colors hover:text-white">
            Back to Home
          </Link>
          <p className="text-sm font-semibold tracking-[0.25em] uppercase text-[rgb(var(--accent))]">
            Digital Systems Audit
          </p>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Find out what to fix, improve, automate, or build next.
          </h1>

          <p className="max-w-3xl text-lg leading-relaxed text-white/65">
            The CEL3 Digital Systems Audit is a fixed $150 strategy session for businesses
            that need clearer websites, workflows, dashboards, portals, bookings, payments,
            customer records, or AI-assisted operations.
          </p>

          <a
            href="#book"
            className="inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
          >
            Book the $150 Digital Systems Audit
          </a>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs tracking-[0.25em] uppercase text-white/45">
                Before you build, map the system
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Avoid buying another disconnected tool.
              </h2>
              <p className="mt-4 text-white/70">
                Many businesses jump straight into a new website, CRM, automation tool, or
                plugin without first mapping how the business actually works. The result is
                often another disconnected tool. The audit helps identify the real bottlenecks
                before a full build is scoped.
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">What we review</h2>
              <BulletGrid items={REVIEW_ITEMS} />
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">What you leave with</h2>
              <BulletGrid items={LEAVE_WITH} />
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">Who this is for</h2>
              <BulletGrid items={WHO_FOR} />
            </section>

            <section className="rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">Investment</h2>
              <p className="mt-3 text-4xl font-semibold">$150</p>
              <p className="mt-3 text-white/75">
                The Digital Systems Audit is a one-time fixed-price assessment. Full platform
                pricing is scoped separately after the audit.
              </p>
            </section>
          </div>

          <aside id="book" className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:sticky lg:top-6">
              <h2 className="text-xl font-semibold">Pay $150 and Book Your Audit</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                This is a paid strategy session designed to produce practical direction:
                what to do now, what to do later, and what to avoid.
              </p>

              <div className="mt-6">
                <AssessmentPaymentCard />
              </div>

              <p className="mt-4 text-xs text-white/45">
                By submitting, you agree to be contacted by CEL3 Interactive about your request.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
