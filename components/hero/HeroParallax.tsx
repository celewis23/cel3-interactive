"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useHeroParallax } from "./useHeroParallax";

export default function HeroParallax({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const p = useHeroParallax({
    maxTiltDeg: 6,
    maxShiftPx: 14,
    spring: { stiffness: 110, damping: 18, mass: 0.7 },
  });

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md"
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        p.onPointerMove(e.clientX, e.clientY, rect);
      }}
      onMouseLeave={() => p.onPointerLeave()}
    >
      {/* iOS motion permission prompt (only shows when required) */}
      {p.needsPermission && !p.motionEnabled ? (
        <div className="absolute right-3 top-3 z-20">
          <button
            onClick={() => p.enableMotion()}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
          >
            Enable Motion
          </button>
        </div>
      ) : null}

      {/* Scene container (perspective) */}
      <motion.div
        className="relative z-10"
        style={{
          transformStyle: "preserve-3d",
          perspective: 900,
          rotateX: p.rotateX,
          rotateY: p.rotateY,
        }}
      >
        {/* Far layer: subtle grid/noise */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            x: p.shiftX, // move with shift but less depth by scaling via transform in css
            y: p.shiftY,
            translateZ: -30,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        </motion.div>

        {/* Mid layer: glow */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            x: p.shiftX,
            y: p.shiftY,
            translateZ: 10,
          }}
        >
          <div className="absolute -inset-12 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.14),transparent_55%)]" />
        </motion.div>

        {/* Near layer: your actual content */}
        <motion.div
          className="relative"
          style={{
            x: p.shiftX,
            y: p.shiftY,
            translateZ: 30,
          }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Vignette for depth */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/35" />
      </div>
    </div>
  );
}
