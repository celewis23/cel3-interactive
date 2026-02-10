"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "../layout/Section";

type CapKey = "experiences" | "platforms" | "data" | "ai";

const CAPS: Record<CapKey, { title: string; desc: string; detail: string }> = {
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

// Pillar routes (update these paths if your pillar slugs differ)
const CAP_LINKS: Record<CapKey, string> = {
  experiences: "/interactive-digital-experiences",
  platforms: "/custom-web-applications",
  data: "/custom-data-dashboards",
  ai: "/ai-enhanced-systems",
};

export function CapabilityMatrix() {
  const router = useRouter();
  const [active, setActive] = useState<CapKey>("experiences");

  const activeCap = useMemo(() => CAPS[active], [active]);

  const items: { key: CapKey; label: string }[] = [
    { key: "experiences", label: "Interactive Experiences" },
    { key: "platforms", label: "Web Applications & Platforms" },
    { key: "data", label: "Data & Intelligent Interfaces" },
    { key: "ai", label: "AI-Enhanced Systems" },
  ];

  const handleNavigate = (key: CapKey) => {
    const href = CAP_LINKS[key];
    if (href) router.push(href);
  };

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

          {/* Optional: a clear link under the details (keeps UX obvious) */}
          <button
            type="button"
            onClick={() => handleNavigate(active)}
            className="mt-6 inline-flex items-center text-sm font-semibold text-white/80 hover:text-white"
          >
            Learn more about {activeCap.title} →
          </button>
        </div>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((i) => (
              <button
                key={i.key}
                type="button"
                onMouseEnter={() => setActive(i.key)}
                onFocus={() => setActive(i.key)}
                // Click now routes to the pillar page (instead of just setting active)
                onClick={() => handleNavigate(i.key)}
                className={[
                  "group text-left rounded-2xl border p-5 transition-colors outline-none",
                  active === i.key
                    ? "border-[rgb(var(--accent))]/100 bg-[rgb(var(--accent))]/20"
                    : "border-white/10 bg-white/5 hover:bg-white/8",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white font-medium">{i.label}</p>
                  <span className="text-xs text-white/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Learn more →
                  </span>
                </div>

                <p className="mt-2 text-sm text-white/60">{CAPS[i.key].desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
