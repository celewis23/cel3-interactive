"use client";

import { useMemo, useState } from "react";
import { Section } from "../layout/Section";

type CapKey = "experiences" | "platforms" | "data" | "ai";

const CAPS: Record<
  CapKey,
  { title: string; desc: string; detail: string }
> = {
  experiences: {
    title: "Interactive Experiences",
    desc: "Digital experiences that react to how users move, think, and engage.",
    detail: "Explore a capability to see how the system adapts.",
  },
  platforms: {
    title: "Web Applications & Platforms",
    desc: "Custom platforms and tools built for real-world use and scale.",
    detail: "Interfaces designed for structure, performance, and clarity.",
  },
  data: {
    title: "Data & Intelligent Interfaces",
    desc: "Interfaces that transform data into clarity, action, and insight.",
    detail: "Visual systems that respond instantly to user input.",
  },
  ai: {
    title: "AI-Enhanced Systems",
    desc: "Smarter interactions powered by automation and intelligent logic.",
    detail: "Capability-driven intelligence without gimmicks.",
  },
};

export function CapabilityMatrix() {
  const [active, setActive] = useState<CapKey>("experiences");

  const activeCap = useMemo(() => CAPS[active], [active]);

  const items: { key: CapKey; label: string }[] = [
    { key: "experiences", label: "Interactive Experiences" },
    { key: "platforms", label: "Web Applications & Platforms" },
    { key: "data", label: "Data & Intelligent Interfaces" },
    { key: "ai", label: "AI-Enhanced Systems" },
  ];

  return (
    <Section id="capabilities" eyebrow="Capabilities" title="What We Build">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5">
          <p className="text-sm text-white/55">Explore a capability:</p>
          <h3 className="mt-4 text-2xl font-semibold text-white">
            {activeCap.title}
          </h3>
          <p className="mt-3 text-white/70">{activeCap.desc}</p>
          <p className="mt-6 text-sm text-white/55">{activeCap.detail}</p>
        </div>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((i) => (
              <button
                key={i.key}
                onMouseEnter={() => setActive(i.key)}
                onFocus={() => setActive(i.key)}
                onClick={() => setActive(i.key)}
                className={[
                  "text-left rounded-2xl border p-5 transition-colors outline-none",
                  active === i.key
                    ? "border-[rgb(var(--accent))]/100 bg-[rgb(var(--accent))]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/8",
                ].join(" ")}
              >
                <p className="text-white font-medium">{i.label}</p>
                <p className="mt-2 text-sm text-white/60">{CAPS[i.key].desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
