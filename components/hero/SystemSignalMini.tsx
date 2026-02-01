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
  // calm “live” drift (client-only)
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
      ? "text-white/75"
      : deploy === "warming"
        ? "text-white/75" // <- no accent color here (removes “bluey” feel)
        : "text-white/60";

  // Wave bars: fixed count, gently animated heights
  const bars = Array.from({ length: 18 });

  return (
    <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {/* subtle grid (very faint) */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* scan line (minimal) */}
      <motion.div
        className="absolute inset-y-0 w-28"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)",
          mixBlendMode: "screen",
        }}
        initial={{ x: -160 }}
        animate={{ x: 620 }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
      />

      {/* top-left label + pulse (less distracting) */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <motion.span
          className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[10px] tracking-[0.25em] uppercase text-white/55">
          signal
        </span>
      </div>

      {/* content layout: wave left, metrics right */}
      <div className="absolute inset-0 px-3 pt-9 pb-3">
        <div className="grid h-full grid-cols-12 gap-3">
          {/* LEFT: signal wave */}
          <div className="col-span-7 flex items-end gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-2">
            {bars.map((_, i) => (
              <motion.div
                key={i}
                className="w-[6px] rounded-sm bg-white/25"
                initial={false}
                animate={{
                  height: [8, 18, 10, 22, 12, 16, 9],
                  opacity: [0.18, 0.35, 0.22, 0.42, 0.26, 0.32, 0.2],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>

          {/* RIGHT: metrics (no accent background/underline) */}
          <div className="col-span-5 flex flex-col justify-end rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="space-y-2 text-[10px] tracking-[0.18em] uppercase">
              <div className="flex items-center justify-between">
                <span className="text-white/45">latency</span>
                <motion.span
                  key={latency}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-white/85"
                >
                  {latency}ms
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/45">uptime</span>
                <motion.span
                  key={uptime}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="text-white/85"
                >
                  {formatPct(uptime)}
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/45">deploy</span>
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

      {/* NOTE: Removed the accent underline entirely to eliminate “blue background” feel */}
    </div>
  );
}
