"use client";

import { motion, useReducedMotion, useTime, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

// Multi-layered "software system" composition: a business-console browser
// mock in back, a client-portal card and workflow map overlapping in front,
// anchored by a live status block. All sizes are percentage-based so the
// stack scales down smoothly on small viewports.

const layer = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: "easeOut" as const, delay },
});

// Perpetual drift after the entrance — each layer hovers on a continuous
// sine wave (velocity never stops, unlike segmented keyframes, so there is
// no perceptible "bounce" at the extremes). `phase` offsets each layer's
// position in its cycle so the stack reads as cards floating independently;
// a short amplitude ramp-in keeps the wave from popping on mount. Runs on
// a nested element so it never fights the entrance animation.
const RAMP_SECONDS = 3;
const TWO_PI = Math.PI * 2;

function wave(t: number, period: number, phase: number, travel: number) {
  const ramp = Math.min(t / RAMP_SECONDS, 1);
  return ramp * (travel / 2) * (1 - Math.cos(((t + phase) / period) * TWO_PI));
}

function Float({
  children,
  duration,
  phase = 0,
  distance = 6,
  drift = 0,
}: {
  children: React.ReactNode;
  duration: number;
  phase?: number;
  distance?: number;
  drift?: number;
}) {
  const time = useTime();
  const reduced = useReducedMotion();
  const y = useTransform(time, (ms) =>
    reduced ? 0 : wave(ms / 1000, duration, phase, -distance)
  );
  const x = useTransform(time, (ms) =>
    reduced || !drift ? 0 : wave(ms / 1000, duration * 1.35, phase * 1.7, drift)
  );

  return <motion.div style={{ x, y }}>{children}</motion.div>;
}

const cardShadow = "shadow-[0_24px_48px_-16px_rgba(15,23,42,0.28)]";

// ── Back layer: Business Console browser mock ─────────────────────────────────

function PipelineCard({ chip, chipClass, w1, w2 }: { chip: string; chipClass: string; w1: string; w2: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-1.5 space-y-1">
      <div className={`h-1.5 rounded-full bg-neutral-300 ${w1}`} />
      <div className={`h-1 rounded-full bg-neutral-200 ${w2}`} />
      <span className={`inline-block rounded-full px-1.5 py-px text-[7px] font-semibold ${chipClass}`}>{chip}</span>
    </div>
  );
}

function ConsoleMock() {
  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-white ${cardShadow}`}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <div className="mx-2 flex-1 truncate rounded-md bg-white border border-neutral-200 px-2 py-0.5 text-center text-[8px] text-neutral-400">
          cel3interactive.com/console
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-[27%] shrink-0 border-r border-neutral-200 bg-neutral-50 p-2 sm:block">
          <div className="mb-2 flex items-center gap-1 px-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-700" />
            <span className="text-[8px] font-bold text-neutral-800">cel3interactive</span>
          </div>
          {["Dashboard", "Pipeline", "Clients", "Invoices", "Automations", "Settings"].map((item, i) => (
            <div
              key={item}
              className={`rounded px-1.5 py-1 text-[8px] ${
                i === 1 ? "bg-emerald-700/10 font-semibold text-emerald-900" : "text-neutral-500"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="min-w-0 flex-1 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-900">Business Console</span>
            <span className="flex items-center gap-1 rounded-full border border-neutral-200 px-1.5 py-px text-[7px] text-neutral-500">
              <span className="h-1 w-1 rounded-full bg-green-500" /> Live
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[8px] font-semibold text-neutral-600">Ordered Pipeline</span>
            <span className="rounded bg-sky-600 px-1.5 py-0.5 text-[7px] font-semibold text-white">Create pipeline</span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div className="space-y-1.5">
              <div className="text-[7px] font-semibold uppercase tracking-wide text-neutral-400">New Intake · 3</div>
              <PipelineCard chip="Estimate sent" chipClass="bg-sky-100 text-sky-700" w1="w-3/4" w2="w-1/2" />
              <PipelineCard chip="New lead" chipClass="bg-amber-100 text-amber-700" w1="w-2/3" w2="w-3/5" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[7px] font-semibold uppercase tracking-wide text-neutral-400">In Progress · 2</div>
              <PipelineCard chip="Building" chipClass="bg-violet-100 text-violet-700" w1="w-4/5" w2="w-1/2" />
              <PipelineCard chip="In review" chipClass="bg-sky-100 text-sky-700" w1="w-3/5" w2="w-2/3" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[7px] font-semibold uppercase tracking-wide text-neutral-400">Done · 8</div>
              <PipelineCard chip="Invoiced" chipClass="bg-emerald-100 text-emerald-700" w1="w-2/3" w2="w-1/2" />
              <PipelineCard chip="Paid" chipClass="bg-emerald-100 text-emerald-700" w1="w-3/4" w2="w-2/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Left overlap: Client Portal card ──────────────────────────────────────────

function PortalCard() {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-3 ${cardShadow}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-sky-500 to-violet-500" />
          <span className="text-[9px] font-bold text-neutral-900">BioBox</span>
        </div>
        <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[7px] text-neutral-500">Client</span>
      </div>

      <p className="mt-2 text-xs font-semibold text-neutral-900">Client portal</p>
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 w-11/12 rounded-full bg-neutral-200" />
        <div className="h-1.5 w-3/5 rounded-full bg-neutral-200" />
      </div>

      <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2">
        <div className="h-1 w-2/3 rounded-full bg-neutral-300" />
        <div className="mt-1 h-1 w-1/3 rounded-full bg-neutral-200" />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="rounded-md bg-sky-600 px-2 py-1 text-[8px] font-semibold text-white">Send Message</span>
        <span className="flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[8px] font-semibold text-neutral-600">
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
          </svg>
          Upload File
        </span>
      </div>

      <p className="mt-2.5 border-t border-neutral-100 pt-1.5 text-[7px] text-neutral-400">
        Sacred Vibes Yoga · 2 new updates
      </p>
    </div>
  );
}

// ── Right overlap: Workflow map card ──────────────────────────────────────────

const FLOW_NODES = [
  {
    label: "Website",
    icon: (
      <>
        <circle cx="0" cy="0" r="7" />
        <path d="M-7 0h14M0 -7c2.6 2 2.6 12 0 14c-2.6 -2 -2.6 -12 0 -14z" />
      </>
    ),
  },
  {
    label: "Intake",
    icon: (
      <>
        <path d="M-7 -1v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
        <path d="M-7 -1l3 -5h8l3 5h-4.5l-1.5 2h-2l-1.5 -2z" />
      </>
    ),
  },
  {
    label: "CRM",
    icon: (
      <>
        <ellipse cx="0" cy="-4" rx="7" ry="2.6" />
        <path d="M-7 -4v8c0 1.4 3.1 2.6 7 2.6s7 -1.2 7 -2.6v-8" />
        <path d="M-7 0c0 1.4 3.1 2.6 7 2.6S7 1.4 7 0" />
      </>
    ),
  },
  {
    label: "Dashboard",
    icon: (
      <>
        <path d="M-6 6v-5M-2 6v-9M2 6v-6M6 6v-11" />
        <path d="M-7.5 7.5h15" />
      </>
    ),
  },
];

function WorkflowCard() {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-3 ${cardShadow}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
        </div>
        <span className="flex items-center gap-1 text-[7px] uppercase tracking-wider text-neutral-400">
          <span className="h-1 w-1 rounded-full bg-emerald-500" /> live
        </span>
      </div>

      <svg viewBox="0 0 340 96" className="mt-2 w-full" aria-label="Workflow: website to intake to CRM to dashboard">
        {/* connectors */}
        {[0, 1, 2].map((i) => {
          const x1 = 62 + i * 88;
          const x2 = x1 + 40;
          return (
            <g key={i} stroke="#059669" strokeWidth="1.5" fill="none">
              <motion.line
                x1={x1}
                y1="40"
                x2={x2}
                y2="40"
                strokeDasharray="4 4"
                animate={{ strokeDashoffset: [0, -16] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              />
              <path d={`M${x2 - 4} 36l5 4l-5 4`} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* nodes */}
        {FLOW_NODES.map((node, i) => {
          const cx = 40 + i * 88;
          return (
            <g key={node.label}>
              <rect
                x={cx - 21}
                y={19}
                width="42"
                height="42"
                rx="10"
                fill="#ecfdf5"
                stroke="#a7f3d0"
                strokeWidth="1.5"
              />
              <g
                transform={`translate(${cx}, 40)`}
                stroke="#047857"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {node.icon}
              </g>
              <text x={cx} y={78} textAnchor="middle" fontSize="9" fontWeight="600" fill="#525252">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-right text-[7px] uppercase tracking-wider text-neutral-400">
        Operational Workflow Map
      </p>
    </div>
  );
}

// ── Anchor: live status block ─────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function StatusBlock() {
  const [latency, setLatency] = useState(38);

  useEffect(() => {
    const t = setInterval(() => {
      setLatency((v) => Math.round(clamp(v + (Math.random() * 2 - 1) * 3, 28, 52)));
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[8px] uppercase tracking-wider text-neutral-500">
        latency <span className="font-semibold text-neutral-800 tabular-nums">{latency}ms</span>
      </span>
      <span className="text-[8px] uppercase tracking-wider text-neutral-500">
        uptime <span className="font-semibold text-neutral-800">99.98%</span>
      </span>
      <span className="text-[8px] uppercase tracking-wider text-neutral-500">
        deploy <span className="font-semibold text-emerald-700">synced</span>
      </span>
    </div>
  );
}

// ── Composition ───────────────────────────────────────────────────────────────

export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] aspect-[10/9] sm:aspect-[6/5]">
      <motion.div {...layer(0.1)} className="absolute right-0 top-0 z-10 w-[86%]">
        <Float duration={10} distance={7}>
          <ConsoleMock />
        </Float>
      </motion.div>

      <motion.div {...layer(0.3)} className="absolute left-0 top-[36%] z-20 w-[44%] min-w-[168px]">
        <Float duration={8} phase={2.6} distance={5} drift={3}>
          <PortalCard />
        </Float>
      </motion.div>

      <motion.div {...layer(0.45)} className="absolute bottom-[10%] right-[2%] z-30 w-[62%] min-w-[230px]">
        <Float duration={9} phase={5.2} distance={6} drift={-3}>
          <WorkflowCard />
        </Float>
      </motion.div>

      <motion.div {...layer(0.6)} className="absolute bottom-0 right-[2%] z-30">
        <Float duration={7} phase={1.4} distance={4}>
          <StatusBlock />
        </Float>
      </motion.div>
    </div>
  );
}
