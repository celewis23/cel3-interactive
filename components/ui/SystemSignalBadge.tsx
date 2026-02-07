"use client";

import { motion, useReducedMotion } from "framer-motion";

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/25 px-3 py-2">
      <div className="text-[9px] tracking-[0.22em] uppercase text-white/45">
        {label}
      </div>

      {/* Key fixes: min-w-0 + truncate */}
      <div
        className={[
          "mt-1 min-w-0 truncate text-[12px] font-semibold leading-none",
          accent ? "text-[rgb(var(--accent))]" : "text-white/85",
        ].join(" ")}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

export default function SystemSignalBadge() {
  const reduce = !!useReducedMotion();

  return (
    <div className="relative w-full md:w-[440px] lg:w-[520px] rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-5 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.25em] uppercase text-white/55">
          System Signal
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
          CRM / Dashboards
        </div>
      </div>

      {/* Force 3 equal columns that can shrink properly */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-[5px] uppercase">
        <Metric label="LATENCY" value="38ms" />
        <Metric label="UPTIME" value="99.98%" />
        <Metric label="DPLMNT" value="SYNCED" accent />
      </div>

      {/* sweep */}
      {!reduce ? (
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-24 w-24 opacity-60"
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: 520, opacity: [0, 0.6, 0.8, 0.6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(var(--accent),0.45), transparent)",
            }}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
