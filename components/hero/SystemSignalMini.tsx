"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function formatPct(n: number) {
  return `${n.toFixed(2)}%`;
}

export function SystemSignalMini() {
  const [latency, setLatency] = useState(38);
  const [uptime, setUptime] = useState(99.98);
  const [deploy, setDeploy] = useState<"synced" | "warming" | "indexing">("synced");
  const seed = useMemo(() => Math.random(), []);

  useEffect(() => {
    const t = setInterval(() => {
      setLatency((v) => {
        const drift = (seed * 2 - 1) * 1.0 + (Math.random() * 2 - 1) * 2.0;
        return Math.round(clamp(v + drift, 26, 64));
      });

      setUptime((v) => {
        const drift = (Math.random() * 2 - 1) * 0.01;
        return clamp(Number((v + drift).toFixed(2)), 99.9, 100);
      });

      setDeploy(() => {
        const roll = Math.random();
        if (roll < 0.06) return "indexing";
        if (roll < 0.09) return "warming";
        return "synced";
      });
    }, 1800);

    return () => clearInterval(t);
  }, [seed]);

  const deployClass =
    deploy === "synced"
      ? "text-[rgb(var(--accent))]/90"
      : deploy === "warming"
        ? "text-white/75"
        : "text-white/60";

  return (
    <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {/* faint grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* scan line (subtle) */}
      <motion.div
        className="absolute inset-y-0 z-10 w-28"
        style={{
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)",
          mixBlendMode: "screen",
        }}
        initial={{ x: -160 }}
        animate={{ x: 760 }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "linear" }}
      />

      {/* label + subtle pulse */}
      <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
        <motion.span
          className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]"
          animate={{ opacity: [0.16, 0.38, 0.16] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[10px] tracking-[0.25em] uppercase text-white/55">
          signal
        </span>
      </div>

      {/* layout */}
      <div className="absolute inset-0 z-20 px-3 pt-9 pb-3">
        <div className="grid h-full grid-cols-12 gap-3">
          {/* LEFT: seamless oscilloscope wave */}
          <div className="col-span-7 relative overflow-hidden rounded-lg border border-white/10 bg-black/25">
            {/* centerline */}
            <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/10" />

            {/* seamless wave */}
            <div className="absolute inset-0">
              <SeamlessWave />
            </div>

            {/* vignette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />

            {/* faint glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                background:
                  "radial-gradient(600px 140px at 35% 55%, rgba(255,255,255,0.18), transparent 60%)",
              }}
            />
          </div>

          {/* RIGHT: metrics */}
          <div className="col-span-5 rounded-lg border border-white/10 bg-black/25 px-3 py-2 flex flex-col justify-end">
            <div className="space-y-2 text-[10px] tracking-[0.18em] uppercase">
              <div className="flex items-center justify-between">
                <span className="text-white/45">
                  <span className="sm:inline hidden">LATENCY</span>
                  <span className="inline sm:hidden">LAT</span>
                </span>
                <motion.span
                  key={latency}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-white/95"
                >
                  {latency}ms
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/45">
                  <span className="sm:inline hidden">UPTIME</span>
                  <span className="inline sm:hidden">UPT</span>
                </span>

                <motion.span
                  key={uptime}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-white/95"
                >
                  {formatPct(uptime)}
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/45">
                  <span className="sm:inline hidden">DEPLOY</span>
                  <span className="inline sm:hidden">DPL</span>
                </span>

                <motion.span
                  key={deploy}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={deployClass}
                >
                  {deploy}
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* soft gloss */}
      <div className="pointer-events-none absolute inset-0 z-30 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/6 to-white/0" />
      </div>
    </div>
  );
}

function SeamlessWave() {
  /**
   * Technique:
   * - Make a repeatable path segment (one “tile” width)
   * - Render it as a pattern
   * - Animate the pattern translation endlessly
   * Result: no seam, ever.
   */
  return (
    <motion.svg
      className="h-full w-full"
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Repeatable tile width = 200 units */}
        <pattern id="waveTileAccent" patternUnits="userSpaceOnUse" width="200" height="160">
          {/* This path starts and ends at the same Y = 80, so the tile edges match */}
          <path
            d="M0,80
               C25,80 35,30 60,30
               C85,30 95,130 120,130
               C145,130 155,55 180,55
               C190,55 195,70 200,80"
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </pattern>

        <pattern id="waveTileWhite" patternUnits="userSpaceOnUse" width="200" height="160">
          <path
            d="M0,88
               C30,88 45,55 70,55
               C95,55 110,110 135,110
               C160,110 170,70 190,70
               C195,70 198,78 200,88"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </pattern>

        {/* Glow filters */}
        <filter id="accentGlow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.35 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* animate the pattern by translating a group */}
      <motion.g
        initial={{ x: 0 }}
        animate={{ x: -200 }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
      >
        {/* We paint wider than the viewport so translation never exposes empty space */}
        <rect x="0" y="0" width="1000" height="160" fill="url(#waveTileWhite)" opacity="0.9" />
        <rect
          x="0"
          y="0"
          width="1000"
          height="160"
          fill="url(#waveTileAccent)"
          filter="url(#accentGlow)"
          opacity="1"
        />
      </motion.g>
    </motion.svg>
  );
}
