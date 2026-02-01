"use client";

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Variant = "respond" | "adapt" | "evolve";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MicroViz({ variant }: { variant: Variant }) {
  // ✅ framer-motion can return boolean | null depending on version/types
  const reduce = !!useReducedMotion();
  const seed = useMemo(() => Math.random(), []);

  if (variant === "respond") return <RespondViz reduce={reduce} seed={seed} />;
  if (variant === "adapt") return <AdaptViz reduce={reduce} seed={seed} />;
  return <EvolveViz reduce={reduce} seed={seed} />;
}

function RespondViz({ reduce, seed }: { reduce: boolean; seed: number }) {
  const d1 = clamp(18 + seed * 10, 16, 28);
  const d2 = clamp(42 + seed * 14, 40, 56);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Intent</div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">Vector</div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/30 overflow-hidden">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-white/15" />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[rgb(var(--accent))]/70" />

        {!reduce ? (
          <>
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/55"
              initial={{ left: 10, opacity: 0.6 }}
              animate={{ left: [10, d1, 10], opacity: [0.45, 0.75, 0.45] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-[6px] w-[6px] rounded-full bg-white/35"
              initial={{ left: 22, opacity: 0.4 }}
              animate={{ left: [22, d2, 22], opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-20"
              style={{
                background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
                mixBlendMode: "screen",
              }}
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 260, opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          </>
        ) : (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/55" />
        )}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Ack: <span className="text-white/70">locked</span>
      </div>
    </div>
  );
}

function AdaptViz({ reduce, seed }: { reduce: boolean; seed: number }) {
  const shift = clamp(6 + seed * 10, 6, 14);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">Layout</div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">Reflow</div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/30 overflow-hidden p-2">
        <motion.div
          className="grid h-full w-full grid-cols-6 gap-1"
          initial={false}
          animate={reduce ? {} : { x: [0, shift, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className={[
                "rounded-sm border border-white/10 bg-white/5",
                i % 7 === 0 ? "bg-[rgba(var(--accent),0.14)] border-[rgba(var(--accent),0.20)]" : "",
              ].join(" ")}
            />
          ))}
        </motion.div>

        {!reduce && (
          <motion.div
            className="absolute left-2 right-2 bottom-2 h-[2px] bg-[rgba(var(--accent),0.55)]"
            animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.25, 0.6, 0.25] }}
            style={{ transformOrigin: "left" }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Breakpoint: <span className="text-white/70">stable</span>
      </div>
    </div>
  );
}

function EvolveViz({ reduce }: { reduce: boolean; seed: number }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">System</div>
        <div className="flex items-center gap-2">
          <motion.span
            className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]/80"
            animate={reduce ? {} : { opacity: [0.25, 0.8, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">Health</div>
        </div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/30 overflow-hidden p-2">
        <svg viewBox="0 0 100 32" className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M0,22 C12,10 24,26 36,16 C48,6 60,24 72,14 C84,4 92,16 100,8"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0,24 C12,14 24,28 36,18 C48,10 60,26 72,16 C84,8 92,18 100,10"
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>

        {!reduce && (
          <motion.div
            className="absolute inset-y-0 w-20"
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
              mixBlendMode: "screen",
            }}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 260, opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Uptime: <span className="text-white/70">nominal</span>
      </div>
    </div>
  );
}
