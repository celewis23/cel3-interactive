"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
