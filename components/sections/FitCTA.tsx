import Link from "next/link";
import { Section } from "../layout/Section";

export function FitCTA() {
  return (
    <Section
      id="fitCTA"
      eyebrow="Next"
      title="Not sure what you need? Start with a $150 Digital Systems Audit."
      variant="tight"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/assessment"
          className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 hover:border-[rgb(var(--accent))]/100 transition-colors"
        >
          Book a $150 Digital Systems Audit
        </Link>
        <Link
          href="#work"
          className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/70 hover:text-[rgb(var(--accent))]/100 hover:bg-[rgb(var(--accent))]/10 transition-colors"
        >
          View Platform Work
        </Link>
      </div>
    </Section>
  );
}
