"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { Variant } from "@/components/ui/MicroViz";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Client-only viz to prevent hydration mismatch from animations
const MicroViz = dynamic(() => import("@/components/ui/MicroViz"), {
  ssr: false,
});

type Props = {
  variant: Variant;
  eyebrow: string;
  title: string;
  desc: string;
  footLeft: string;
  footRight: string;

  isActive?: boolean;
  isDimmed?: boolean;
  onToggle?: () => void;
};

export default function InteractiveCard({
  variant,
  eyebrow,
  title,
  desc,
  footLeft,
  footRight,
  isActive,
  isDimmed,
  onToggle,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [locked, setLocked] = useState(false);
  const [lockedPoint, setLockedPoint] = useState<{ x: number; y: number } | null>(null);

  const dimClass = isDimmed ? "opacity-45" : "opacity-100";
  const externalActive = !!isActive;

  const interaction = useMemo(
    () => ({
      locked,
      lockedPoint,
      externalActive: externalActive || locked,
    }),
    [locked, lockedPoint, externalActive]
  );

  const setPointFromClient = (clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    setLockedPoint({ x, y });
  };

  const toggleLockAt = (clientX: number, clientY: number) => {
    setPointFromClient(clientX, clientY);
    setLocked((v) => !v);
    onToggle?.();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left click / primary touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    toggleLockAt(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // While locked, allow scrubbing by dragging anywhere in the card
    if (!locked) return;
    setPointFromClient(e.clientX, e.clientY);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // If keyboard, lock centered
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      toggleLockAt(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-pressed={locked || !!isActive}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      // Allows vertical page scroll on touch while still letting MicroViz scrub
      style={{ touchAction: "pan-y" }}
      className={[
        "relative text-left rounded-2xl border border-white/10 bg-black/25 backdrop-blur",
        "p-5 transition-colors outline-none",
        "hover:bg-black/30 focus:ring-2 focus:ring-white/15",
        dimClass,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.25em] uppercase text-white/55">{eyebrow}</div>
        <div className="text-[10px] tracking-[0.22em] uppercase">
          <span className={locked ? "text-[rgb(var(--accent))]" : "text-white/40"}>
            {locked ? "locked" : "tap"}
          </span>
        </div>
      </div>

      <div className="mt-3 text-lg font-semibold tracking-tight text-white">{title}</div>
      <div className="mt-2 text-sm text-white/70">{desc}</div>

      {/* Make sure the viz always receives input */}
      <div className="mt-4 pointer-events-auto">
        <MicroViz variant={variant} className="h-[92px]" interaction={interaction} />
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.22em] uppercase">
        <div className="text-white/45">{footLeft}</div>
        <div className={locked ? "text-[rgb(var(--accent))]/90" : "text-white/55"}>
          {locked ? "engaged" : footRight}
        </div>
      </div>

      {locked ? (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            boxShadow:
              "0 0 0 1px rgba(var(--accent),0.35) inset, 0 0 0 12px rgba(var(--accent),0.04) inset",
          }}
        />
      ) : null}
    </motion.div>
  );
}
