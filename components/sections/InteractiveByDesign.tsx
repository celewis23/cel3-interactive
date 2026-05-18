"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import InteractiveCard from "@/components/ui/InteractiveCard";

type ActiveVariant = "respond" | "adapt" | "evolve" | null;

export default function InteractiveByDesign() {
  const [active, setActive] = useState<ActiveVariant>(null);

  // ESC closes (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="approach" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">
            Built around the work
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Tools that feel clear and useful
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            We focus on the practical details that make technology easier to use:
            clear screens, reliable workflows, and information people can act on.
          </p>
        </div>
      </div>

      {/* Tap/click outside closes (mobile-friendly, premium) */}
      <AnimatePresence>
        {active ? (
          <div
            className="fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setActive(null)}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative z-40 mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <InteractiveCard
          variant="respond"
          eyebrow="Clarify"
          title="Screens that explain what matters"
          desc="Users should know where they are, what changed, and what needs attention without digging through noise."
          footLeft="Status"
          footRight="Clear"
          isActive={active === "respond"}
          isDimmed={active !== null && active !== "respond"}
          onToggle={() => setActive((v) => (v === "respond" ? null : "respond"))}
        />

        <InteractiveCard
          variant="adapt"
          eyebrow="Organize"
          title="Workflows that match the business"
          desc="Forms, dashboards, and portals are structured around how your team actually works."
          footLeft="Flow"
          footRight="Aligned"
          isActive={active === "adapt"}
          isDimmed={active !== null && active !== "adapt"}
          onToggle={() => setActive((v) => (v === "adapt" ? null : "adapt"))}
        />

        <InteractiveCard
          variant="evolve"
          eyebrow="Maintain"
          title="Systems that are easier to run"
          desc="Good tools reduce repeated admin, make handoffs easier, and keep important details visible."
          footLeft="Status"
          footRight="Stable"
          isActive={active === "evolve"}
          isDimmed={active !== null && active !== "evolve"}
          onToggle={() => setActive((v) => (v === "evolve" ? null : "evolve"))}
        />
      </div>
    </section>
  );
}
