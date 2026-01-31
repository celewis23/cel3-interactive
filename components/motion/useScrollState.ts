"use client";

import { useEffect, useState } from "react";

export type ScrollState = "idle" | "activated";

/**
 * useScrollState
 *
 * Returns:
 * - "idle"      → user has not scrolled past threshold
 * - "activated" → user has scrolled past threshold
 *
 * Designed for subtle UI compression / system activation effects.
 */
export function useScrollState(threshold: number = 30): ScrollState {
  const [state, setState] = useState<ScrollState>("idle");

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > threshold) {
        setState("activated");
      } else {
        setState("idle");
      }
    };

    // Run once on mount
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
