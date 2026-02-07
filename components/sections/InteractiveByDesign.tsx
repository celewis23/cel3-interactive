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
            Interactive by design
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Interfaces that feel alive
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Not animation for animation’s sake. Systems that respond to intent, adapt to context,
            and communicate state with clarity.
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
          eyebrow="Respond"
          title="Design that reacts to intent"
          desc="Hover, scroll, and input become signals. The UI acknowledges the user and guides the next move."
          footLeft="Intent"
          footRight="Locked"
          isActive={active === "respond"}
          isDimmed={active !== null && active !== "respond"}
          onToggle={() => setActive((v) => (v === "respond" ? null : "respond"))}
        />

        <InteractiveCard
          variant="adapt"
          eyebrow="Adapt"
          title="Layouts that reflow intelligently"
          desc="Components shift like a living grid. Information prioritizes itself as context changes."
          footLeft="Grid"
          footRight="Reflow"
          isActive={active === "adapt"}
          isDimmed={active !== null && active !== "adapt"}
          onToggle={() => setActive((v) => (v === "adapt" ? null : "adapt"))}
        />

        <InteractiveCard
          variant="evolve"
          eyebrow="Evolve"
          title="Systems that communicate state"
          desc="Micro-metrics, health indicators, and quiet motion make complex platforms feel simple."
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
