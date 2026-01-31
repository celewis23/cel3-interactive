"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useHeroParallax } from "./useHeroParallax";

export default function HeroParallax({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
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
      className={["relative", className].join(" ")}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        p.onPointerMove(e.clientX, e.clientY, rect);
      }}
      onMouseLeave={() => p.onPointerLeave()}
    >
      {/* iOS motion permission button (only when needed) */}
      {p.needsPermission && !p.motionEnabled ? (
        <div className="absolute right-0 top-0 z-30">
          <button
            onClick={() => p.enableMotion()}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
          >
            Enable Motion
          </button>
        </div>
      ) : null}

      {/* 3D scene */}
      <motion.div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          perspective: 900,
          rotateX: p.rotateX,
          rotateY: p.rotateY,
        }}
      >
        {/* Far layer: subtle depth texture (inside the foreground only) */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            x: p.shiftX,
            y: p.shiftY,
            translateZ: -30,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.07),transparent_50%)]" />
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
          <div className="absolute -inset-16 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.14),transparent_55%)]" />
        </motion.div>

        {/* Foreground content */}
        <motion.div
          className="relative z-10"
          style={{
            x: p.shiftX,
            y: p.shiftY,
            translateZ: 30,
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
