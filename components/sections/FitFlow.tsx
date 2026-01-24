"use client";

import { useMemo, useState } from "react";
import { Section } from "../layout/Section";

type Step = 1 | 2 | 3;

export function FitFlow() {
  const [step, setStep] = useState<Step>(1);
  const title = useMemo(() => {
    if (step === 1) return "What are you building?";
    if (step === 2) return "Where are you in the process?";
    return "Let’s start a conversation.";
  }, [step]);

  return (
    <Section id="fit-flow" eyebrow="Fit Flow" title={title}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs text-white/55">Step {step} of 3</p>

        {step === 1 ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Digital Product / Platform",
              "Interactive Website",
              "Internal Tool / Dashboard",
              "AI-Enhanced System",
              "Not Sure Yet",
            ].map((x) => (
              <button
                key={x}
                className="rounded-xl border border-white/10 bg-black/20 p-4 text-left text-white/80 hover:bg-black/30 transition-colors"
                onClick={() => setStep(2)}
              >
                {x}
              </button>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 space-y-3">
            {[
              "Idea stage, planning seriously",
              "Existing product, needs evolution",
              "Scaling or rebuilding",
              "Replacing something that no longer works",
            ].map((x) => (
              <button
                key={x}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left text-white/80 hover:bg-black/30 transition-colors"
                onClick={() => setStep(3)}
              >
                {x}
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <form className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35"
              placeholder="Name"
            />
            <input
              className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35"
              placeholder="Company"
            />
            <input
              className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35"
              placeholder="Email"
            />
            <textarea
              className="md:col-span-2 min-h-[120px] rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35"
              placeholder="Optional message"
            />
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                className="rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                onClick={() => alert("Wireframe submit placeholder")}
              >
                Submit
              </button>
              <p className="text-xs text-white/55">
                We only take on a limited number of projects at a time.
              </p>
            </div>
          </form>
        ) : null}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((Math.max(1, step - 1) as Step))}
            className="text-sm text-white/60 hover:text-white transition-colors"
            disabled={step === 1}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((Math.min(3, step + 1) as Step))}
            className="text-sm text-white/60 hover:text-white transition-colors"
            disabled={step === 3}
          >
            Next
          </button>
        </div>
      </div>
    </Section>
  );
}
