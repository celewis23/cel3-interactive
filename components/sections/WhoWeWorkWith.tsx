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
      subtitle="The best projects start with a real business problem, not a trend."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 text-white/70 space-y-4">
          <p className="text-white/85 font-medium">
            We partner with businesses that need clearer, more useful technology.
          </p>
          <p>We value clear priorities, practical scope, and maintainable solutions.</p>
          <p>
            We work with clients who want websites, tools, and workflows that make daily operations easier.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-white/85 font-medium">Alignment</p>
            <p className="mt-2 text-sm text-white/60">
              This work is built for teams that want better systems, not louder promises.
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
                    ? "border-[rgb(var(--accent))]/100 bg-[rgb(var(--accent))]/10 text-white"
                    : "border-white/10 text-white/70 hover:text-white hover:bg-[rgb(var(--accent))]/100",
                ].join(" ")}
              >
                Transactional
              </button>

              <button
                onClick={() => setMode("strategic")}
                className={[
                  "flex-1 rounded-full border px-4 py-2 text-sm transition-colors",
                  mode === "strategic"
                    ? "border-[rgb(var(--accent))]/100 bg-[rgb(var(--accent))]/10 text-white"
                    : "border-white/10 text-white/70 hover:text-white hover:bg-[rgb(var(--accent))]/100",
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
                    One-off fixes, unclear goals, or tools chosen before the problem is understood.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white/85 font-medium">Strategic</p>
                  <p className="mt-2 text-sm text-white/60">
                    Clear business need, thoughtful scope, and a willingness to improve how work gets done.
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
