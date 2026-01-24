"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
  useMotionTemplate,
} from "framer-motion";

export function HeroSystem() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      cursorX.set(nx);
      cursorY.set(ny);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [cursorX, cursorY]);

  // Scroll pipeline
  const { scrollY } = useScroll();
  const p = useTransform(scrollY, [0, 420], [0, 1]);

  // Activation threshold + pulse + grid snap triggers
  const activateAt = 0.12;
  const wasActive = useRef(false);

  const pulseControls = useAnimationControls();
  const gridSnapControls = useAnimationControls();

  useMotionValueEvent(p, "change", (value) => {
    const activeNow = value >= activateAt;

    if (!wasActive.current && activeNow) {
      // Pulse the system
      pulseControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.45, ease: "easeOut" },
      });

      // Snap-to-grid flash
      gridSnapControls.start({
        opacity: [0, 0.38, 0],
        transition: { duration: 0.55, ease: "easeOut" },
      });
    }

    wasActive.current = activeNow;
  });

  // Cursor stays strong longer; stabilizes on scroll
  const cursorWeight = useTransform(p, [0, 1], [1.25, 0.6]);

  // Big parallax translation
  const rawX = useTransform([cursorX, cursorWeight], (v: number[]) => {
    const [x, w] = v as [number, number];
    return x * 60 * w;
  });
  const rawY = useTransform([cursorY, cursorWeight], (v: number[]) => {
    const [y, w] = v as [number, number];
    return y * 46 * w;
  });

  const tx = useSpring(rawX, { stiffness: 95, damping: 18 });
  const ty = useSpring(rawY, { stiffness: 95, damping: 18 });

  // TILT with scroll dampening
  const tiltWeight = useTransform(p, [0, 1], [1.0, 0.55]);

  const rawTiltX = useTransform([cursorY, tiltWeight], (v: number[]) => {
    const [y, w] = v as [number, number];
    return (-y * 14) * w;
  });
  const rawTiltY = useTransform([cursorX, tiltWeight], (v: number[]) => {
    const [x, w] = v as [number, number];
    return (x * 18) * w;
  });

  const tiltX = useSpring(rawTiltX, { stiffness: 110, damping: 20 });
  const tiltY = useSpring(rawTiltY, { stiffness: 110, damping: 20 });

  // System morph
  const ringOpacity = useTransform(p, [0, 0.12, 0.35, 1], [0.10, 0.34, 0.22, 0.16]);
  const scale = useTransform(p, [0, 0.35, 1], [1.08, 1.0, 0.90]);
  const connectorOpacity = useTransform(p, [0, 0.25, 1], [0.08, 0.38, 0.22]);

  // Depth layers (outer + inner)
  const rawOuterX = useTransform(cursorX, (x) => (x as number) * 34);
  const rawOuterY = useTransform(cursorY, (y) => (y as number) * 26);
  const rawInnerX = useTransform(cursorX, (x) => (x as number) * 18);
  const rawInnerY = useTransform(cursorY, (y) => (y as number) * 14);

  const outerX = useSpring(rawOuterX, { stiffness: 80, damping: 20 });
  const outerY = useSpring(rawOuterY, { stiffness: 80, damping: 20 });
  const innerX = useSpring(rawInnerX, { stiffness: 130, damping: 20 });
  const innerY = useSpring(rawInnerY, { stiffness: 130, damping: 20 });

  // Background / vignette changes
  const ambientOpacity = useTransform(p, [0, 1], [1, 0.92]);
  const gridOpacity = useTransform(p, [0, 0.35, 1], [0.06, 0.13, 0.09]);
  const outerOpacity = useTransform(p, [0, 1], [0.14, 0.06]);

  // TRAIL: build a glow that follows cursor in percent space
  const cx = useTransform(cursorX, [-0.5, 0.5], [35, 65]);
  const cy = useTransform(cursorY, [-0.5, 0.5], [35, 65]);

  // Give it a soft “linger” by springing the cursor-driven percent
  const cxS = useSpring(cx, { stiffness: 120, damping: 20 });
  const cyS = useSpring(cy, { stiffness: 120, damping: 20 });

  const trailOpacity = useTransform(p, [0, 1], [0.30, 0.12]);
  const trailBg = useMotionTemplate`
    radial-gradient(circle at ${cxS}% ${cyS}%,
      rgba(255,255,255,0.18),
      rgba(58,242,229,0.12) 18%,
      transparent 48%)
  `;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ambient gradients */}
      <motion.div
        style={{ opacity: ambientOpacity }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(58,242,229,0.14),transparent_48%),radial-gradient(circle_at_80%_40%,rgba(124,124,255,0.12),transparent_48%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.07),transparent_58%)]"
      />

      {/* TRAIL LAYER */}
      <motion.div
        style={{ opacity: trailOpacity, backgroundImage: trailBg }}
        className="absolute inset-0 blur-2xl"
      />

      {/* Base grid */}
      <motion.div
        style={{ opacity: gridOpacity }}
        className="absolute inset-0 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px]"
      />

      {/* SNAP GRID (tighter grid flashes on activation) */}
      <motion.div
        animate={gridSnapControls}
        initial={{ opacity: 0 }}
        className="absolute inset-0 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:36px_36px]"
        style={{ filter: "blur(0.2px)" }}
      />

      {/* Outer drift ring */}
      <motion.div
        style={{ x: outerX, y: outerY, opacity: outerOpacity }}
        className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
      />

      {/* Perspective wrapper */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ perspective: 900 }}
      >
        {/* Main system */}
        <motion.div
          style={{
            x: tx,
            y: ty,
            rotateX: tiltX,
            rotateY: tiltY,
            scale,
            transformStyle: "preserve-3d",
          }}
          className="relative h-[600px] w-[600px]"
        >
          {/* Pulse wrapper */}
          <motion.div
            animate={pulseControls}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Rings */}
            <motion.div
              style={{ opacity: ringOpacity }}
              className="absolute inset-0 rounded-full border border-white/35"
            />
            <motion.div
              style={{ opacity: ringOpacity }}
              className="absolute inset-[18%] rounded-full border border-white/28"
            />
            <motion.div
              style={{ opacity: ringOpacity }}
              className="absolute inset-[36%] rounded-full border border-white/22"
            />

            {/* Nodes */}
            <motion.div style={{ x: innerX, y: innerY }} className="absolute inset-0">
              <div className="absolute left-[14%] top-[22%] h-2.5 w-2.5 rounded-full bg-white/85" />
              <div className="absolute left-[70%] top-[30%] h-2.5 w-2.5 rounded-full bg-white/70" />
              <div className="absolute left-[38%] top-[72%] h-2.5 w-2.5 rounded-full bg-white/58" />
            </motion.div>

            {/* Connectors */}
            <motion.div style={{ opacity: connectorOpacity }} className="absolute inset-0">
              <div className="absolute left-[16%] top-[24%] h-px w-[56%] bg-white/38 rotate-[12deg]" />
              <div className="absolute left-[40%] top-[72%] h-px w-[36%] bg-white/28 -rotate-[18deg]" />
              <div className="absolute left-[22%] top-[48%] h-px w-[46%] bg-white/22 rotate-[2deg]" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/25 to-black/80" />
    </div>
  );
}
