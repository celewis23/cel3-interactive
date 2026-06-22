import Link from "next/link";
import { Section } from "../layout/Section";

const PLATFORM_ITEMS = [
  "Public Website",
  "Intake",
  "Customer Record",
  "Booking / Payment",
  "Staff Workflow",
  "Follow-Up",
  "Dashboard",
] as const;

export function BusinessConsoleSection() {
  return (
    <Section
      id="business-console"
      eyebrow="Operations layer"
      title="Your website is only the front door."
      subtitle="Most websites stop when a visitor submits a form. CEL3 builds what happens after that."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
          <p className="text-sm text-white/70">
            Most websites stop when a visitor submits a form. CEL3 builds what happens after that:
            the intake flow, customer record, payment path, booking status, follow-up, internal
            dashboard, and reporting surface your team uses every day.
          </p>
          <p className="mt-4 text-sm text-white/60">
            The result is not just a better-looking website. It is a clearer operating system for
            the business behind it.
          </p>
          <Link
            href="/assessment"
            className="mt-6 inline-flex rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white/85 transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/100"
          >
            Map Your System →
          </Link>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list">
            {PLATFORM_ITEMS.map((item, index) => (
              <div
                key={item}
                role="listitem"
                className={[
                  "group relative min-h-[94px] overflow-hidden rounded-xl border p-4",
                  "transform-gpu transition-all duration-300 ease-out",
                  "hover:-translate-y-1 hover:scale-[1.015] hover:border-[rgb(var(--accent))]/75",
                  "hover:bg-[rgb(var(--accent))]/12 hover:shadow-[0_18px_45px_rgba(0,170,255,0.16)]",
                  index === 0 || index === 1
                    ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/15"
                    : "border-white/10 bg-black/25",
                ].join(" ")}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 18% 18%, rgba(0, 170, 255, 0.2), transparent 38%)",
                  }}
                />
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px scale-x-0 bg-[rgb(var(--accent))] opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-80" />

                <div className="relative text-[10px] tracking-[0.22em] uppercase text-white/35 transition-colors duration-300 group-hover:text-[rgb(var(--accent))]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="relative mt-2 flex items-end justify-between gap-3">
                  <div className="text-sm font-medium text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    {item}
                  </div>
                  <span
                    aria-hidden="true"
                    className="translate-x-2 text-sm text-[rgb(var(--accent))] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
