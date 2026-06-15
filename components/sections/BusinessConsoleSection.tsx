import Link from "next/link";
import { Section } from "../layout/Section";

const PLATFORM_ITEMS = [
  "Public Website",
  "Business Console",
  "Customers",
  "Products",
  "Orders",
  "Bookings",
  "Content Management",
  "Email / SMS",
  "Analytics",
  "AI Assistant",
] as const;

export function BusinessConsoleSection() {
  return (
    <Section
      id="business-console"
      eyebrow="Operations layer"
      title="Your website is only the front door."
      subtitle="Behind every serious CEL3 solution is a secure business console that helps your team manage customers, products, bookings, content, communications, analytics, and operations from one place."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
          <p className="text-sm text-white/70">
            Most websites stop when a visitor clicks submit. CEL3 builds the system behind that moment:
            the intake flow, customer record, follow-up, payment path, booking status, content tools,
            communication history, and reporting surface your team uses every day.
          </p>
          <p className="mt-4 text-sm text-white/60">
            The result is a public website connected to real operations, not a polished page floating
            beside disconnected plugins and spreadsheets.
          </p>
          <Link
            href="/business-consoles-operations-platforms"
            className="mt-6 inline-flex rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white/85 transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
          >
            Build Your Business Console →
          </Link>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PLATFORM_ITEMS.map((item, index) => (
              <div
                key={item}
                className={[
                  "rounded-xl border p-4 transition-colors",
                  index === 0 || index === 1
                    ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/15"
                    : "border-white/10 bg-black/25",
                ].join(" ")}
              >
                <div className="text-[10px] tracking-[0.22em] uppercase text-white/35">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-sm font-medium text-white">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
