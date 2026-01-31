"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "framer-motion";

type ParallaxConfig = {
  maxTiltDeg?: number; // max rotation in degrees
  maxShiftPx?: number; // max translate in px (foreground)
  spring?: { stiffness: number; damping: number; mass: number };
};

export function useHeroParallax(config: ParallaxConfig = {}) {
  const reduceMotion = useReducedMotion();

  const maxTiltDeg = config.maxTiltDeg ?? 6;
  const maxShiftPx = config.maxShiftPx ?? 14;
  const springCfg = config.spring ?? { stiffness: 110, damping: 18, mass: 0.7 };

  // Raw motion values
  const rx = useMotionValue(0); // rotateX
  const ry = useMotionValue(0); // rotateY
  const tx = useMotionValue(0); // translateX
  const ty = useMotionValue(0); // translateY

  // Smoothed motion values
  const rotateX = useSpring(rx, springCfg);
  const rotateY = useSpring(ry, springCfg);
  const shiftX = useSpring(tx, springCfg);
  const shiftY = useSpring(ty, springCfg);

  const [needsPermission, setNeedsPermission] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

  // Desktop pointer driver
  function onPointerMove(clientX: number, clientY: number, rect: DOMRect) {
    if (reduceMotion) return;

    const px = (clientX - rect.left) / rect.width; // 0..1
    const py = (clientY - rect.top) / rect.height; // 0..1

    const nx = clamp((px - 0.5) * 2, -1, 1); // -1..1
    const ny = clamp((py - 0.5) * 2, -1, 1); // -1..1

    const tiltY = nx * maxTiltDeg;
    const tiltX = -ny * maxTiltDeg;

    const sx = nx * maxShiftPx;
    const sy = ny * maxShiftPx;

    ry.set(tiltY);
    rx.set(tiltX);
    tx.set(sx);
    ty.set(sy);
  }

  function onPointerLeave() {
    ry.set(0);
    rx.set(0);
    tx.set(0);
    ty.set(0);
  }

  // --- Mobile motion driver (DeviceOrientation) ---
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const anyWin = window as any;
    const hasRequestPermission =
      typeof anyWin.DeviceOrientationEvent !== "undefined" &&
      typeof anyWin.DeviceOrientationEvent.requestPermission === "function";

    setNeedsPermission(!!hasRequestPermission);

    // If not iOS permission gated, enable automatically if supported
    if (!hasRequestPermission) {
      if ("DeviceOrientationEvent" in window) {
        setMotionEnabled(true);
      }
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (!motionEnabled) return;

    handlerRef.current = (e: DeviceOrientationEvent) => {
      const gamma = typeof e.gamma === "number" ? e.gamma : 0; // left/right
      const beta = typeof e.beta === "number" ? e.beta : 0; // forward/back

      const nx = clamp(gamma / 25, -1, 1);
      const ny = clamp(beta / 25, -1, 1);

      const tiltY = nx * (maxTiltDeg * 0.9);
      const tiltX = -ny * (maxTiltDeg * 0.9);

      const sx = nx * (maxShiftPx * 0.9);
      const sy = ny * (maxShiftPx * 0.9);

      ry.set(tiltY);
      rx.set(tiltX);
      tx.set(sx);
      ty.set(sy);
    };

    window.addEventListener("deviceorientation", handlerRef.current, true);

    return () => {
      if (handlerRef.current) {
        window.removeEventListener("deviceorientation", handlerRef.current, true);
      }
    };
  }, [motionEnabled, reduceMotion, maxTiltDeg, maxShiftPx, rx, ry, tx, ty]);

  async function enableMotion() {
    if (reduceMotion) return;

    try {
      const anyWin = window as any;
      if (
        typeof anyWin.DeviceOrientationEvent !== "undefined" &&
        typeof anyWin.DeviceOrientationEvent.requestPermission === "function"
      ) {
        const res = await anyWin.DeviceOrientationEvent.requestPermission();
        if (res === "granted") setMotionEnabled(true);
      } else {
        setMotionEnabled(true);
      }
    } catch {
      setMotionEnabled(false);
    }
  }

  return useMemo(
    () => ({
      rotateX,
      rotateY,
      shiftX,
      shiftY,
      needsPermission,
      motionEnabled,
      enableMotion,
      onPointerMove,
      onPointerLeave,
    }),
    [
      rotateX,
      rotateY,
      shiftX,
      shiftY,
      needsPermission,
      motionEnabled,
      onPointerMove,
      onPointerLeave,
    ]
  );
}
