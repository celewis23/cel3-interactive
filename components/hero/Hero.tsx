import Link from "next/link";
import { Suspense } from "react";
import { Container } from "../layout/Container";
import { HeroShowcase } from "./HeroShowcase";
import HomeSuccessBanner from "@/components/homeSuccess/HomeSuccessBanner";

export function Hero() {
  return (
    <section id="top" className="relative bg-black pt-28 md:pt-32 pb-16 md:pb-24">
      <Container>
        <Suspense fallback={null}>
          <HomeSuccessBanner />
        </Suspense>

        <div
          className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10"
        >
          {/* Left: copy + CTA */}
          <div className="lg:col-span-6">
            <p
              className="inline-block border-b border-white/15 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50"
            >
              Richmond-based &bull; Custom Portals, Dashboards &amp; AI Workflows
            </p>

            <h1
              className="mt-5 text-3xl font-extrabold uppercase leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[2.6rem]"
            >
              Your website is only the front door. We build the business system behind it.
            </h1>

            <p
              className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            >
              CEL3 Interactive builds websites, client portals, dashboards, and AI-ready automated workflows for
              service businesses that have outgrown disconnected tools and manual
              spreadsheets.
            </p>

            <div className="mt-9">
              <Link
                href="/assessment"
                className="inline-flex items-center rounded-lg bg-[rgb(var(--accent))] px-7 py-4 text-sm font-bold uppercase tracking-wide text-neutral-950 shadow-lg shadow-sky-400/20 transition-colors hover:bg-[rgb(var(--accent-soft))]"
              >
                Book a $150 Digital Systems Audit
              </Link>

              <div className="mt-5">
                <Link
                  href="/#work"
                  className="text-sm font-medium text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-[rgb(var(--accent))] hover:decoration-[rgb(var(--accent))]"
                >
                  See Platform Examples ↓
                </Link>
              </div>
            </div>
          </div>

          {/* Right: layered system showcase */}
          <div className="lg:col-span-6">
            <HeroShowcase />
            <p className="mt-4 text-center text-xs text-white/50">Illustrative platform preview; metrics are examples.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
