"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Variant = "respond" | "adapt" | "evolve";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Smooth random-ish noise that’s stable per index but moves over time */
function noise1D(i: number, t: number, seed: number) {
  const a = Math.sin((t * 0.9 + i * 1.7 + seed * 10.0) * 1.3);
  const b = Math.sin((t * 1.4 + i * 2.3 + seed * 20.0) * 0.8);
  return (a + b) * 0.5; // ~[-1..1]
}

type Pointer = { x: number; y: number; inside: boolean };

export type Interaction = {
  locked?: boolean;
  lockedPoint?: { x: number; y: number } | null;
};

export default function MicroViz({
  variant,
  className = "",
  interaction,
}: {
  variant: Variant;
  className?: string;
  interaction?: Interaction;
}) {
  const reduce = !!useReducedMotion();

  // Deterministic seed (no hydration randomness)
  const seed = useMemo(() => {
    if (variant === "respond") return 0.1337;
    if (variant === "adapt") return 0.4242;
    return 0.7777;
  }, [variant]);

  const [pointer, setPointer] = useState<Pointer>({
    x: 0.5,
    y: 0.5,
    inside: false,
  });

  const locked = !!interaction?.locked;
  const lockedPoint = interaction?.lockedPoint ?? null;

  const targetPoint =
    locked && lockedPoint ? lockedPoint : { x: pointer.x, y: pointer.y };

  /** Single coordinate mapper for pointer/mouse/touch */
  const setFromClientXY = (el: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    setPointer((p) => ({ ...p, x, y }));
  };

  // --- Handlers (pointer + mouse + touch) ---
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    setFromClientXY(e.currentTarget, e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setFromClientXY(e.currentTarget, e.clientX, e.clientY);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    setFromClientXY(e.currentTarget, t.clientX, t.clientY);
  };

  const onEnter = () => setPointer((p) => ({ ...p, inside: true }));
  const onLeave = () =>
    setPointer((p) => ({ ...p, inside: false, x: 0.5, y: 0.5 }));

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    setPointer((p) => ({ ...p, inside: true }));
    setFromClientXY(e.currentTarget, t.clientX, t.clientY);
  };
  const onTouchEnd = () => onLeave();

  return (
    <div
      className={[
        "relative rounded-xl border border-white/10 bg-black/30 overflow-hidden",
        "select-none",
        // IMPORTANT: helps touch “scrub” and reduces iOS weirdness
        "touch-pan-y",
        className,
      ].join(" ")}
      // Pointer events
      onPointerMove={reduce ? undefined : onPointerMove}
      onPointerEnter={reduce ? undefined : onEnter}
      onPointerLeave={reduce ? undefined : onLeave}
      // Mouse fallback (some wrappers/overlays can kill pointer events)
      onMouseMove={reduce ? undefined : onMouseMove}
      onMouseEnter={reduce ? undefined : onEnter}
      onMouseLeave={reduce ? undefined : onLeave}
      // Touch fallback (scrub on mobile)
      onTouchStart={reduce ? undefined : onTouchStart}
      onTouchMove={reduce ? undefined : onTouchMove}
      onTouchEnd={reduce ? undefined : onTouchEnd}
    >
      {variant === "respond" ? (
        <RespondViz
          reduce={reduce}
          seed={seed}
          pointer={pointer}
          locked={locked}
          target={targetPoint}
        />
      ) : variant === "adapt" ? (
        <AdaptViz reduce={reduce} seed={seed} pointer={pointer} locked={locked} />
      ) : (
        // EVOLVE: unchanged behavior, just now reliably receives pointer updates
        <EvolveViz reduce={reduce} seed={seed} pointer={pointer} locked={locked} />
      )}

      {/* soft gloss */}
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
  locked,
  target,
}: {
  reduce: boolean;
  seed: number;
  pointer: Pointer;
  locked: boolean;
  target: { x: number; y: number };
}) {
  const tRef = useRef(0);
  useRafClockRef(reduce, tRef);

  const tx = 14 + target.x * 72;
  const ty = 10 + target.y * 22;

  const dx = pointer.x - target.x;
  const dy = pointer.y - target.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const beatDur = clamp(0.22 + dist * 0.95, 0.22, 1.25);
  const intensity = clamp(1.05 - dist * 0.9, 0.35, 1.05);

  const edge =
    Math.max(Math.abs(pointer.x - 0.5), Math.abs(pointer.y - 0.5)) * 2;
  const tighten = pointer.inside ? clamp(edge, 0, 1) : 0;

  const dots = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => ({
      i,
      x: 10 + (i * 7) % 70,
      y: 10 + ((i * 11) % 18),
      r: 2 + (i % 3),
      o: 0.18 + (i % 5) * 0.08,
    }));
  }, []);

  const t = tRef.current;

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
        <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/10" />

        <div
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
          style={{ left: `${tx}%`, top: `${ty}%` }}
        />

        <motion.div
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--accent))]/90"
          style={{ left: `${tx}%`, top: `${ty}%` }}
          animate={
            reduce
              ? {}
              : locked
              ? { opacity: [0.25, 1, 0.25], scale: [1, 1.25 * intensity, 1] }
              : pointer.inside
              ? { opacity: [0.35, 0.8, 0.35], scale: [1, 1.15, 1] }
              : { opacity: 0.55 }
          }
          transition={{
            duration: locked ? beatDur : 1.35,
            repeat: reduce ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {dots.map((d) => {
          const n = noise1D(d.i, t, seed);
          const pull = pointer.inside ? 0.12 + tighten * 0.18 : 0.06;

          const x = d.x + (tx - d.x) * pull + n * (pointer.inside ? 1.2 : 0.7);
          const y =
            d.y +
            (ty - d.y) * pull +
            noise1D(d.i + 99, t, seed) * 0.9;

          return (
            <motion.div
              key={d.i}
              className="absolute rounded-full bg-white/60"
              style={{
                width: `${d.r}px`,
                height: `${d.r}px`,
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
            opacity={pointer.inside || locked ? 0.95 : 0.65}
          />
        </svg>
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Ack:{" "}
        <span className="text-white/70">
          {locked ? "latched" : pointer.inside ? "tracking" : "locked"}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ ADAPT ------------------------------ */

function AdaptViz({
  reduce,
  seed,
  pointer,
  locked,
}: {
  reduce: boolean;
  seed: number;
  pointer: Pointer;
  locked: boolean;
}) {
  // When user is interacting, we drive “context”
  const active = pointer.inside || locked;

  // 9 tiles in a 3x3 grid
  const tiles = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        // tiny stable variety for visual texture (no Math.random here)
        tone: ((i * 37 + Math.floor(seed * 1000)) % 3) as 0 | 1 | 2,
      })),
    [seed]
  );

  // Determine “priority tile” by context (pointer position)
  // Map pointer to 3x3 index (0..8)
  const ctxIndex = useMemo(() => {
    if (!active) return 4; // center idle
    const col = clamp(Math.floor(pointer.x * 3), 0, 2);
    const row = clamp(Math.floor(pointer.y * 3), 0, 2);
    return row * 3 + col;
  }, [active, pointer.x, pointer.y]);

  // Allow manual priority selection when locked
  const [manual, setManual] = useState<number | null>(null);
  const priority = locked ? manual ?? ctxIndex : ctxIndex;

  // Create a “reflowed order”: priority first, then others
  const ordered = useMemo(() => {
    const rest = tiles.filter((t) => t.id !== priority);
    // mild deterministic shuffle feel so it looks alive but stable
    const rotated = rest.slice((priority + 2) % rest.length).concat(rest.slice(0, (priority + 2) % rest.length));
    return [{ id: priority, tone: tiles[priority].tone }, ...rotated];
  }, [tiles, priority]);

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
        {/* Grid container */}
        <div className="absolute inset-0 p-2">
          <motion.div
            className="grid h-full w-full gap-[6px]"
            style={{
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gridTemplateRows: "repeat(3, minmax(0, 1fr))",
            }}
            layout
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
          >
            {ordered.map((t, idx) => {
              const isHero = t.id === priority;

              // Hero spans 2x2, others span 1x1
              // We do it by setting gridColumn/gridRow on the hero.
              const heroStyle = isHero
                ? {
                    gridColumn: "span 2",
                    gridRow: "span 2",
                  }
                : undefined;

              const baseBg =
                t.tone === 0
                  ? "rgba(255,255,255,0.06)"
                  : t.tone === 1
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.10)";

              return (
                <motion.button
                  key={t.id}
                  type="button"
                  layout
                  onClick={() => {
                    if (!locked) return;
                    setManual(t.id);
                  }}
                  className={[
                    "relative rounded-md border border-white/10 overflow-hidden",
                    "focus:outline-none focus:ring-2 focus:ring-white/10",
                    locked ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                  style={{
                    ...heroStyle,
                    background: baseBg,
                    touchAction: "manipulation",
                  }}
                  whileHover={reduce || !locked ? undefined : { scale: 1.02 }}
                  whileTap={locked ? { scale: 0.98 } : undefined}
                  transition={{ type: "spring", stiffness: 520, damping: 34 }}
                  aria-label={isHero ? "Priority tile" : "Tile"}
                >
                  {/* Priority glow */}
                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={{
                      opacity: isHero ? 1 : 0,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{
                      background:
                        "radial-gradient(120px 60px at 30% 40%, rgba(var(--accent),0.40), transparent 60%), linear-gradient(180deg, rgba(var(--accent),0.20), transparent)",
                    }}
                  />

                  {/* Non-hero dim */}
                  <motion.div
                    className="absolute inset-0"
                    initial={false}
                    animate={{
                      opacity: isHero ? 0 : active ? 0.35 : 0.15,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.22))",
                    }}
                  />

                  {/* Tiny “data tick” */}
                  <motion.div
                    className="absolute right-1 top-1 h-[3px] w-[3px] rounded-full bg-white"
                    initial={false}
                    animate={{
                      opacity: isHero ? 0.9 : 0.25,
                    }}
                    transition={{ duration: 0.18 }}
                  />
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Subtle “context sweep” when active */}
        {!reduce && active ? (
          <motion.div
            className="absolute inset-y-0 left-0 w-20"
            initial={{ x: -90, opacity: 0 }}
            animate={{ x: 260, opacity: [0, 0.35, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)",
              mixBlendMode: "screen",
            }}
          />
        ) : null}
      </div>

      <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/45">
        Priority:{" "}
        <span className="text-white/70">
          {locked ? "latched" : pointer.inside ? "shifting" : "stable"}
        </span>
      </div>
    </div>
  );
}


/* ------------------------------ EVOLVE ----------------------------- */

function EvolveViz({
  reduce,
  seed,
  pointer,
  locked,
}: {
  reduce: boolean;
  seed: number;
  pointer: Pointer;
  locked: boolean;
}) {
  const [t, setT] = useState(0);
  useRafClock(reduce, setT);

  // while inside, curve sticks to pointer coordinate
  const px = pointer.inside || locked ? pointer.x : 0.5;
  const py = pointer.inside || locked ? pointer.y : 0.55;

  // amplitude increases as you move upward (py -> 0)
  const amp = clamp(0.18 + (1 - py) * 0.95, 0.18, 1.15);

  // curve centerline follows pointer Y
  const center = clamp(0.35 + py * 0.45, 0.25, 0.85);

  // width of the bell (sigma): narrower when near edges for “snappier” feel
  const edge = Math.abs(px - 0.5) * 2; // 0..1
  const sigma = clamp(0.12 - edge * 0.04, 0.075, 0.12);

  // If locked: scroll the graph left-to-right repeatedly
  // We do this by translating a tiled group.
  const scroll = locked ? (t % 2.4) / 2.4 : 0;

  return (
    <div className="relative p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-white/55">System</div>
        <div className="flex items-center gap-2">
          <motion.span
            className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent))]/80"
            animate={reduce ? {} : { opacity: (pointer.inside || locked) ? [0.25, 0.65, 0.25] : 0.25 }}
            transition={{ duration: 2.6, repeat: (pointer.inside || locked) ? Infinity : 0, ease: "easeInOut" }}
          />
          <div className="text-[10px] tracking-[0.22em] uppercase text-white/45">Evolve</div>
        </div>
      </div>

      <div className="mt-3 relative h-10 rounded-lg border border-white/10 bg-black/25 overflow-hidden p-2">
        <svg viewBox="0 0 100 32" className="h-full w-full" preserveAspectRatio="none">
          {/* baseline */}
          <path
            d={`M0,${16} L100,${16}`}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* scrolling group when locked */}
          <g transform={locked ? `translate(${scroll * 100},0)` : undefined}>
            {/* draw 2 tiles so translation never shows empty */}
            <BellWaveTile
              px={px}
              center={center}
              amp={amp}
              sigma={sigma}
              seed={seed}
              pointerActive={pointer.inside || locked}
              xOffset={0}
            />
            <BellWaveTile
              px={px}
              center={center}
              amp={amp}
              sigma={sigma}
              seed={seed}
              pointerActive={pointer.inside || locked}
              xOffset={-100}
            />
          </g>

          {/* tracer dot at pointer coord */}
          <circle
            cx={clamp(10 + px * 80, 8, 92)}
            cy={clamp(8 + py * 16, 6, 26)}
            r="1.7"
            fill="rgba(var(--accent),0.92)"
            opacity={pointer.inside || locked ? 1 : 0.55}
          />
        </svg>

        {!reduce && (pointer.inside || locked) ? (
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
        Graph: <span className="text-white/70">{locked ? "latched" : pointer.inside ? "tracking" : "idle"}</span>
      </div>
    </div>
  );
}

function BellWaveTile({
  px,
  center,
  amp,
  sigma,
  seed,
  pointerActive,
  xOffset,
}: {
  px: number;
  center: number;
  amp: number;
  sigma: number;
  seed: number;
  pointerActive: boolean;
  xOffset: number;
}) {
  // Map normalized 0..1 into svg x 0..100
  const mu = clamp(px, 0.08, 0.92);

  // Build bell curve with a tiny reactive ripple so it feels “alive”
  // y = center - amp * exp(-((x-mu)^2)/(2*sigma^2)) + small ripple
  const yCenter = 16 * center + 8; // keep in visible band
  const amplitude = 10.5 * amp; // px
  const sig = sigma * 100;

  const points: Array<[number, number]> = [];
  for (let xi = 0; xi <= 100; xi += 4) {
    const xNorm = xi / 100;
    const dx = (xi - mu * 100);
    const gauss = Math.exp(-(dx * dx) / (2 * sig * sig));
    const ripple = 0.75 * gauss * Math.sin((xi * 0.22) + seed * 10);
    const y = yCenter - amplitude * gauss + ripple;
    points.push([xi, clamp(y, 5, 27)]);
  }

  const d = points
    .map((p, idx) => (idx === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");

  return (
    <>
      {/* base line */}
      <path
        d={d}
        transform={`translate(${xOffset},0)`}
        fill="none"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* accent line */}
      <path
        d={d}
        transform={`translate(${xOffset},0)`}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={pointerActive ? 0.92 : 0.7}
      />
    </>
  );
}


/* ------------------------------ RAF CLOCK -------------------------- */

function useRafClockRef(reduce: boolean, tRef: React.MutableRefObject<number>) {
  const raf = useRef<number | null>(null);
  const start = useRef<number>(0);

  useEffect(() => {
    if (reduce) return;

    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      tRef.current = (ts - start.current) / 1000;
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      start.current = 0;
    };
  }, [reduce, tRef]);
}
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
