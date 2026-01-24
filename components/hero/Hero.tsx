"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Container } from "../layout/Container";
import { HeroSystem } from "./HeroSystem";

export function Hero() {
  const { scrollY } = useScroll();
  const p = useTransform(scrollY, [0, 420], [0, 1]);

  const h1Y = useTransform(p, [0, 1], [0, -34]);
  const h1Scale = useTransform(p, [0, 1], [1, 0.82]);

  const subOpacity = useTransform(p, [0, 1], [1, 0.42]);
  const hintOpacity = useTransform(p, [0, 0.2], [0.75, 0]);


  const h1LetterSpacing = useTransform(p, [0, 1], ["-0.02em", "-0.04em"]);

  // Activated after first few pixels
  const activatedOpacity = useTransform(p, [0, 0.12], [0.6, 0.35]);

  return (
    <section id="top" className="relative min-h-[92vh] pt-24 md:pt-28">
      <HeroSystem />

      <Container>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.h1
              style={{ y: h1Y, scale: h1Scale, letterSpacing: h1LetterSpacing }}
              className="text-5xl md:text-6xl font-semibold tracking-tight text-white origin-left"
            >
              Design That Responds.
            </motion.h1>

            <motion.p
              style={{ opacity: subOpacity }}
              className="mt-6 text-base md:text-lg text-white/75 max-w-xl"
            >
              We build interactive digital systems for businesses ready to invest
              in forward-thinking technology.
            </motion.p>

            <motion.p style={{ opacity: activatedOpacity }} className="mt-6 text-sm text-white/55">
              Move. Scroll. Watch the system react.
            </motion.p>

            <div className="mt-10 flex items-center gap-4">
              <a
                href="#fit"
                className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-white/10 transition-colors"
              >
                Let’s See If We’re a Fit
              </a>

              <a href="#work" className="text-sm text-white/70 hover:text-white transition-colors">
                View Work
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <motion.div
              style={{ opacity: subOpacity, y: useTransform(p, [0, 1], [0, 10]) }}
              className="relative rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur"
            >
              <p className="text-xs tracking-[0.25em] uppercase text-white/50">
                System Signal
              </p>
              <p className="mt-3 text-white/80">
                Interactive experiences. Platforms. Data interfaces. AI-enhanced systems.
              </p>
              <div className="mt-6 h-24 rounded-xl border border-white/10 bg-white/5" />
            </motion.div>
          </div>
        </div>
      </Container>

      {/* Scroll hint */}
      <motion.a
        href="#approach"
        style={{ opacity: hintOpacity }}
        className="absolute left-1/2 bottom-8 -translate-x-1/2 text-xs text-white/55 hover:text-white transition-colors"
      >
        Scroll to activate
      </motion.a>
    </section>
  );
}
