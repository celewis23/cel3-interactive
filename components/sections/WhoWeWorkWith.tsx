"use client";

import { useState } from "react";
import { Section } from "../layout/Section";

type Mode = "transactional" | "strategic";

export function WhoWeWorkWith() {
  const [mode, setMode] = useState<Mode>("strategic");

  return (
    <Section
      id="who"
      eyebrow="Fit"
      title="Who We Work With"
      subtitle="Not every project is a fit. That’s intentional."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 text-white/70 space-y-4">
          <p className="text-white/85 font-medium">
            We partner with revenue-generating teams.
          </p>
          <p>We value long-term thinking over quick fixes.</p>
          <p>
            We work with clients who understand real investment creates real
            results.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-white/85 font-medium">Alignment</p>
            <p className="mt-2 text-sm text-white/60">
              This site is built for teams thinking beyond the next release.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/55">Project Alignment</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("transactional")}
                className={[
                  "flex-1 rounded-full border px-4 py-2 text-sm transition-colors",
                  mode === "transactional"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-white/70 hover:text-white",
                ].join(" ")}
              >
                Transactional
              </button>

              <button
                onClick={() => setMode("strategic")}
                className={[
                  "flex-1 rounded-full border px-4 py-2 text-sm transition-colors",
                  mode === "strategic"
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-white/70 hover:text-white",
                ].join(" ")}
              >
                Strategic
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
              {mode === "transactional" ? (
                <>
                  <p className="text-white/85 font-medium">Transactional</p>
                  <p className="mt-2 text-sm text-white/60">
                    Short-term needs, minimal scope, limited investment.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white/85 font-medium">Strategic</p>
                  <p className="mt-2 text-sm text-white/60">
                    Long-term vision, thoughtful systems, meaningful investment.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
