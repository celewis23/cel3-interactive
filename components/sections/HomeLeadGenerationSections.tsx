import Link from "next/link";
import { Section } from "../layout/Section";

const PAIN_POINTS = [
  "Your website gets inquiries, but follow-up is manual",
  "Customer details live in spreadsheets, inboxes, or scattered tools",
  "Booking, payment, forms, CRM, and email tools do not talk to each other",
  "Your team copies the same information from place to place",
  "You need a client portal, dashboard, admin console, or better internal workflow",
  "You are curious about AI, but need practical automation with human control",
] as const;

const BUILDS = [
  {
    title: "Business Websites",
    desc: "Clear, high-signal websites that explain what you do and guide visitors toward action.",
  },
  {
    title: "Client Portals",
    desc: "Secure customer-facing portals for requests, files, messages, invoices, project status, and account activity.",
  },
  {
    title: "Business Consoles",
    desc: "Private admin systems for managing customers, bookings, products, payments, content, staff workflows, and reporting.",
  },
  {
    title: "Custom Dashboards",
    desc: "Decision-focused dashboards that turn scattered data into clear views your team can act on.",
  },
  {
    title: "Booking & Payment Workflows",
    desc: "Custom flows for scheduling, intake, Stripe payments, order status, reminders, and customer follow-up.",
  },
  {
    title: "AI-Assisted Operations",
    desc: "AI support for summaries, reply drafts, follow-ups, content, reporting, and admin work with human approval built in.",
  },
] as const;

const AUDIT_ITEMS = [
  "Website and digital presence review",
  "Current tools and workflow review",
  "Customer journey review",
  "Admin bottleneck identification",
  "Recommendations for what to fix, improve, automate, or build",
  "Clear next-step roadmap",
] as const;

export function HomeProblemSection() {
  return (
    <Section
      id="is-this-you"
      eyebrow="Fit"
      title="Is this you?"
      subtitle="If your website looks fine but the business behind it feels messy, CEL3 can help."
      variant="tight"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAIN_POINTS.map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
            <span className="text-[rgb(var(--accent))]">•</span> {item}
          </div>
        ))}
      </div>

      <Link
        href="/assessment"
        className="mt-8 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
      >
        Start with a $150 Digital Systems Audit
      </Link>
    </Section>
  );
}

export function HomeBuildsSection() {
  return (
    <Section
      id="what-cel3-builds"
      eyebrow="What CEL3 builds"
      title="CEL3 builds the practical systems that sit behind a serious business website."
      variant="tight"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUILDS.map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{item.desc}</p>
          </div>
        ))}
      </div>

      <Link
        href="/assessment"
        className="mt-8 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
      >
        Book a Systems Audit
      </Link>
    </Section>
  );
}

export function HomeAuditSection() {
  return (
    <Section
      id="digital-systems-audit"
      eyebrow="Digital Systems Audit"
      title="Start with a $150 Digital Systems Audit"
      subtitle="Before you spend thousands on another website, plugin, CRM, or automation tool, let’s map what is actually slowing the business down."
      variant="tight"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">What is included</h3>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIT_ITEMS.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-white/75">
                <span className="text-[rgb(var(--accent))]">•</span> {item}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[rgb(var(--accent))]/35 bg-[rgb(var(--accent))]/10 p-6">
          <h3 className="text-2xl font-semibold tracking-tight text-white">
            Not sure what you need?
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            You will leave with a practical recommendation: what to do now, what to do later,
            and what to avoid.
          </p>
          <Link
            href="/assessment"
            className="mt-6 inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm text-white transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
          >
            Book the $150 Audit
          </Link>
        </div>
      </div>
    </Section>
  );
}
