"use client";

import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Variant = "respond" | "adapt" | "evolve";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Deterministic hash -> 0..1 (stable on server + client) */
function hashToUnit(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return (h >>> 0) / 4294967295;
}

/** Smooth random-ish noise that’s stable per index but moves over time */
function noise1D(i: number, t: number, seed: number) {
  const a = Math.sin((t * 0.9 + i * 1.7 + seed * 10.0) * 1.3);
  const b = Math.sin((t * 1.4 + i * 2.3 + seed * 20.0) * 0.8);
  return (a + b) * 0.5; // ~[-1..1]
}

/** Pointer state normalized to 0..1 */
type Pointer = { x: number; y: number; inside: boolean };

export default function MicroViz({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  // Some framer-motion typings return boolean | null
  const reduce = !!useReducedMotion();

  // Stable seed across SSR + client hydration
  const rid = useId();
  const seed = useMemo(() => hashToUnit(rid), [rid]);

  const [pointer, setPointer] = useState<Pointer>({
    x: 0.5,
    y: 0.5,
    inside: false,
  });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    setPointer((p) => ({ ...p, x, y }));
  };

  const onEnter = () => setPointer((p) => ({ ...p, inside: true }));
  const onLeave = () =>
    setPointer((p) => ({ ...p, inside: false, x: 0.5, y: 0.5 }));

  return (
    <div
      className={[
        "relative rounded-xl border border-white/10 bg-black/30 overflow-hidden",
        "select-none",
        className,
      ].join(" ")}
      onPointerMove={reduce ? undefined : onMove}
      onPointerEnter={reduce ? undefined : onEnter}
      onPointerLeave={reduce ? undefined : onLeave}
    >
      {variant === "respond" ? (
        <RespondViz reduce={reduce} seed={seed} pointer={pointer} />
      ) : variant === "adapt" ? (
        <AdaptViz reduce={reduce} seed={seed} pointer={pointer} />
      ) : (
        <EvolveViz reduce={reduce} pointer={pointer} />
      )}

      {/* soft gloss on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/6 to-white/0" />
      </div>
    </div>
  );
}

/* ----------------------------- RESPOND ----------------------------- */

function RespondViz({
  reduce,
  seed,
  pointer,
}: {
  reduce: boolean;
  seed: number;
  pointer: Pointer;
}) {
  const [t, setT] = useState(0);
  useRafClock(reduce, setT);

  // Target moves with pointer; clamp to keep it inside a comfortable area
  const tx = 14 + pointer.x * 72;
  const ty = 10 + pointer.y * 22;

  // “Lock” strength increases as you move toward edges
  const edge =
    Math.max(Math.abs(pointer.x - 0.5), Math.abs(pointer.y - 0.5)) * 2; // 0..1
  const tighten = pointer.inside ? clamp(edge, 0, 1) : 0;

  const dots = useMemo(() => {
    // stable initial positions
    return Array.from({ length: 10 }).map((_, i) => ({
      i,
      x: 10 + (i * 7) % 70,
      y: 10 + ((i * 11) % 18),
      r: 2 + (i % 3),
      o: 0.18 + (i % 5) * 0.08,
    }));
  }, []);

  return (
    <div className="relative p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">
          Intent
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
          Response
        </div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/25 overflow-hidden">
        {/* Centerline */}
        <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {/* Target ring */}
        <div
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
          style={{ left: `${tx}%`, top: `${ty}%` }}
        />
        <div
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--accent))]/75"
          style={{ left: `${tx}%`, top: `${ty}%` }}
        />

        {/* Dots drift toward target */}
        {dots.map((d) => {
          const n = noise1D(d.i, t, seed);
          const pull = pointer.inside ? 0.12 + tighten * 0.18 : 0.06;

          const x = d.x + (tx - d.x) * pull + n * (pointer.inside ? 1.2 : 0.7);
          const y =
            d.y + (ty - d.y) * pull + noise1D(d.i + 99, t, seed) * 0.9;

          // IMPORTANT: make width/height explicitly strings ("2px") so SSR/client match
          const sizePx = `${d.r}px`;

          return (
            <motion.div
              key={d.i}
              className="absolute rounded-full bg-white/60"
              style={{
                width: sizePx,
                height: sizePx,
                left: `${clamp(x, 4, 96)}%`,
                top: `${clamp(y, 10, 90)}%`,
                opacity: d.o,
              }}
              animate={
                reduce
                  ? {}
                  : {
                      opacity: pointer.inside ? d.o + 0.18 : d.o,
                      scale: pointer.inside ? 1.08 : 1,
                    }
              }
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 20,
                mass: 0.7,
              }}
            />
          );
        })}

        {/* Vector line */}
        <svg className="absolute inset-0" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path
            d={`M5,20 C30,${20 + (pointer.y - 0.5) * 10}
               55,${20 + (pointer.y - 0.5) * 14}
               ${tx},${ty + 6}`}
            fill="none"
            stroke="rgba(255,255,255,0.26)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d={`M5,22 C30,${22 + (pointer.y - 0.5) * 10}
               55,${22 + (pointer.y - 0.5) * 14}
               ${tx},${ty + 8}`}
            fill="none"
            stroke="rgba(var(--accent),0.55)"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={pointer.inside ? 0.95 : 0.65}
          />
        </svg>
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Ack:{" "}
        <span className="text-white/70">{pointer.inside ? "tracking" : "locked"}</span>
      </div>
    </div>
  );
}

/* ------------------------------ ADAPT ------------------------------ */

function AdaptViz({
  reduce,
  seed,
  pointer,
}: {
  reduce: boolean;
  seed: number;
  pointer: Pointer;
}) {
  const [t, setT] = useState(0);
  useRafClock(reduce, setT);

  const bars = 12;

  const gain = pointer.inside ? clamp(0.25 + (1 - pointer.y) * 0.95, 0.2, 1.2) : 0.35;
  const spread = pointer.inside ? clamp(0.15 + pointer.x * 0.65, 0.15, 0.9) : 0.18;

  return (
    <div className="relative p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">
          Layout
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
          Adapt
        </div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/25 overflow-hidden">
        <div className="absolute inset-0 px-3 py-2">
          <div className="grid h-full grid-cols-12 gap-[6px] items-end">
            {Array.from({ length: bars }).map((_, i) => {
              const n = noise1D(i, t, seed);
              const n2 = noise1D(i + 50, t * 0.85, seed);

              const level = clamp(0.18 + (n * 0.5 + n2 * 0.5) * spread, 0.05, 1);
              const height = clamp(level * gain, 0.06, 1);

              const isAccent = i === 7;

              return (
                <motion.div
                  key={i}
                  className="relative w-full rounded-sm overflow-hidden border border-white/10 bg-white/5"
                  style={{ height: "100%" }}
                >
                  <motion.div
                    className={[
                      "absolute bottom-0 left-0 right-0",
                      isAccent ? "bg-[rgba(var(--accent),0.75)]" : "bg-white/25",
                    ].join(" ")}
                    animate={
                      reduce
                        ? {}
                        : {
                            height: `${height * 100}%`,
                            opacity: pointer.inside ? 0.9 : 0.55,
                          }
                    }
                    transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.7 }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {!reduce ? (
          <motion.div
            className="absolute left-3 right-3 bottom-2 h-[2px] bg-[rgba(var(--accent),0.55)]"
            animate={{
              scaleX: pointer.inside ? [0.2, 1, 0.2] : 0.35,
              opacity: pointer.inside ? [0.25, 0.6, 0.25] : 0.25,
            }}
            style={{ transformOrigin: "left" }}
            transition={{
              duration: pointer.inside ? 2.2 : 0.6,
              repeat: pointer.inside ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        ) : null}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Breakpoint:{" "}
        <span className="text-white/70">{pointer.inside ? "reflowing" : "stable"}</span>
      </div>
    </div>
  );
}

/* ------------------------------ EVOLVE ----------------------------- */

function EvolveViz({
  reduce,
  pointer,
}: {
  reduce: boolean;
  pointer: Pointer;
}) {
  const amp = pointer.inside ? 0.7 + (1 - pointer.y) * 0.9 : 0.75;
  const phase = pointer.inside ? pointer.x * 18 : 6;

  return (
    <div className="relative p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">
          System
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]/80"
            animate={reduce ? {} : { opacity: pointer.inside ? [0.25, 0.65, 0.25] : 0.25 }}
            transition={{ duration: 2.6, repeat: pointer.inside ? Infinity : 0, ease: "easeInOut" }}
          />
          <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">
            Evolve
          </div>
        </div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/25 overflow-hidden p-2">
        <svg viewBox="0 0 100 32" className="h-full w-full" preserveAspectRatio="none">
          <path
            d={wavePath(amp, phase, 0)}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={wavePath(amp, phase, 1)}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={pointer.inside ? 0.9 : 0.7}
          />
          <circle
            cx={clamp(15 + pointer.x * 70, 10, 90)}
            cy={clamp(16 + (pointer.y - 0.5) * 10, 8, 24)}
            r="1.6"
            fill="rgba(var(--accent),0.9)"
            opacity={pointer.inside ? 1 : 0.55}
          />
        </svg>

        {!reduce && pointer.inside ? (
          <motion.div
            className="absolute inset-y-0 w-20"
            style={{
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
              mixBlendMode: "screen",
            }}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 260, opacity: [0, 0.75, 0] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Health: <span className="text-white/70">{pointer.inside ? "tuning" : "nominal"}</span>
      </div>
    </div>
  );
}

function wavePath(amp: number, phase: number, layer: 0 | 1) {
  const a = 7 * amp + (layer ? 0.6 : 0);
  const p = phase * (layer ? 1.2 : 1);
  const y0 = 16;

  const c1 = y0 - a * Math.sin((p + 0) * 0.15);
  const c2 = y0 + a * Math.sin((p + 4) * 0.15);
  const c3 = y0 - a * Math.sin((p + 8) * 0.15);
  const c4 = y0 + a * Math.sin((p + 12) * 0.15);

  return `M0,${y0}
    C12,${c1} 25,${c2} 33,${y0}
    C45,${c2} 55,${c3} 66,${y0}
    C78,${c3} 88,${c4} 100,${y0}`;
}

/* ------------------------------ RAF CLOCK -------------------------- */

function useRafClock(reduce: boolean, setT: (n: number) => void) {
  const raf = useRef<number | null>(null);
  const start = useRef<number>(0);

  useEffect(() => {
    if (reduce) return;

    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const t = (ts - start.current) / 1000; // seconds
      setT(t);
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      start.current = 0;
    };
  }, [reduce, setT]);
}
