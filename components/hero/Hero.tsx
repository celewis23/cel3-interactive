"use client";

import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { HeroSystem } from "./HeroSystem";
import { useScrollState } from ".././motion/useScrollState";
import HeroParallax from "./HeroParallax";

export function Hero() {
  const scrollState = useScrollState(30);
  const activated = scrollState === "activated";

  return (
    <section id="top" className="relative min-h-[92vh] pt-24 md:pt-28">
      {/* Keep HeroSystem OUTSIDE any 3D transform to avoid breaking its positioning */}
      <HeroSystem />

      <Container>
        {/* Parallax only affects the foreground content */}
        <HeroParallax className="relative">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
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
                Design That Responds.
              </motion.h1>

              <motion.p
                animate={{
                  opacity: activated ? 0.85 : 1,
                  y: activated ? -2 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 text-base md:text-lg text-white/75 max-w-xl"
              >
                We build interactive digital systems for businesses ready to invest
                in forward-thinking technology.
              </motion.p>

              <motion.p
                animate={{ opacity: activated ? 0.35 : 0.6 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-6 text-sm text-white/55"
              >
                Move. Scroll. Watch the system react.
              </motion.p>

              <div className="mt-10 flex items-center gap-4">
                <a
                  href="#fit"
                  className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  Let’s See If We’re a Fit
                </a>

                <a
                  href="#work"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  View Work
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                animate={{
                  opacity: activated ? 0.85 : 1,
                  y: activated ? 8 : 0,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur"
              >
                <p className="text-xs tracking-[0.25em] uppercase text-white/50">
                  System Signal
                </p>
                <p className="mt-3 text-white/80">
                  Interactive experiences. Platforms. Data interfaces. AI-enhanced
                  systems.
                </p>
                <div className="mt-6 h-24 rounded-xl border border-white/10 bg-white/5" />
              </motion.div>
            </div>
          </div>
        </HeroParallax>
      </Container>
    </section>
  );
}
