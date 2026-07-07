"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "../layout/Container";
import { HeroShowcase } from "./HeroShowcase";
import HomeSuccessBanner from "@/components/homeSuccess/HomeSuccessBanner";

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero() {
  function scrollToWork(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("work");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <section id="top" className="relative bg-black pt-28 md:pt-32 pb-16 md:pb-24">
      <Container>
        <Suspense fallback={null}>
          <HomeSuccessBanner />
        </Suspense>

        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10"
        >
          {/* Left: copy + CTA */}
          <div className="lg:col-span-6">
            <motion.p
              variants={rise}
              className="inline-block border-b border-white/15 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50"
            >
              Richmond-based &bull; Custom Portals, Dashboards &amp; AI Workflows
            </motion.p>

            <motion.h1
              variants={rise}
              className="mt-5 text-3xl font-extrabold uppercase leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[2.6rem]"
            >
              Your website is only the front door. We build the business system behind it.
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            >
              Websites, client portals, dashboards, and AI-ready automated workflows for
              service businesses that have outgrown disconnected tools and manual
              spreadsheets.
            </motion.p>

            <motion.div variants={rise} className="mt-9">
              <Link
                href="/assessment"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-7 py-4 text-sm font-bold uppercase tracking-wide text-neutral-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
              >
                Book a $150 Digital Systems Audit
              </Link>

              <div className="mt-5">
                <Link
                  href="/#work"
                  onClick={scrollToWork}
                  className="text-sm font-medium text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-emerald-300 hover:decoration-emerald-300"
                >
                  See Platform Examples ↓
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Right: layered system showcase */}
          <div className="lg:col-span-6">
            <HeroShowcase />
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
