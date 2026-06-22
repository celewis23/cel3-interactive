"use client";

import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { HeroSystem } from "./HeroSystem";
import { useScrollState } from "../motion/useScrollState";
import HeroParallax from "./HeroParallax";
import { SystemSignalMini } from "./SystemSignalMini";
import { Suspense } from "react";
import HomeSuccessBanner from "@/components/homeSuccess/HomeSuccessBanner";


export function Hero() {
  const scrollState = useScrollState(30);
  const activated = scrollState === "activated";

  return (
    <section
      id="top"
      className="relative overflow-visible min-h-[92vh] md:min-h-[88vh] lg:min-h-[92vh] pt-24 md:pt-28 pb-16"
    >

      {/* Background system layer (kept out of 3D transforms) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <HeroSystem />
      </div>
        
      <Container>
        <Suspense fallback={null}>
          <HomeSuccessBanner/>
        </Suspense>
        {/* Foreground only gets parallax */}
        <HeroParallax className="relative">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: headline */}
            <div className="lg:col-span-7">
              <motion.h1
                animate={{
                  opacity: 1,
                  y: activated ? -8 : 0,
                  scale: activated ? 0.92 : 1,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-5xl md:text-6xl font-semibold tracking-tight text-white origin-left"
              >
                Websites, portals, dashboards, and AI-ready systems for businesses that have outgrown disconnected tools.
              </motion.h1>

              <motion.p
                animate={{
                  opacity: activated ? 0.85 : 1,
                  y: activated ? -2 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 text-base md:text-lg text-white/75 max-w-xl"
              >
                CEL3 Interactive builds custom business platforms that connect your public
                website to the real work behind it: customers, bookings, payments, content,
                communication, reporting, and operations.
              </motion.p>

              <motion.p
                animate={{ opacity: activated ? 0.35 : 0.6 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 text-sm text-white/55"
              >
                Your website is only the front door. We build the business system behind it.
              </motion.p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a
                  href="/assessment"
                  className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-[rgb(var(--accent))]/100 transition-colors hover:border-[rgb(var(--accent))]"
                >
                  Book a $150 Digital Systems Audit
                </a>

                <a
                  href="/work"
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  See Platform Examples
                </a>
              </div>
              <p className="mt-4 max-w-xl text-sm text-gray-300">
                Start with a fixed-price assessment before committing to a full build.
              </p>

            </div>

            {/* Right: system card */}
            <div className="lg:col-span-5">
              <motion.div
                animate={{
                  opacity: activated ? 0.9 : 1,
                  y: activated ? 8 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative w-full max-w-[560px] rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur lg:ml-auto"
              >
                <p className="text-xs tracking-[0.25em] uppercase text-white/50">
                  Platform Layer
                </p>

                <p className="mt-3 text-white/80">
                  Public website. Intake. Customer records. Bookings and payments.
                  Staff workflow. Follow-up. Dashboards. AI-assisted admin.
                </p>

                {/* IMPORTANT: do NOT wrap in h-24, SystemSignalMini already controls its own height */}
                <div className="mt-6">
                  <SystemSignalMini />
                </div>
              </motion.div>
            </div>
          </div>
        </HeroParallax>
      </Container>
    </section>
  );
}
