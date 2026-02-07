"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERVICE_OPTIONS = [
  "Interactive Website",
  "Web App / Dashboard",
  "Brand + Motion System",
  "E-commerce",
  "AI / Automation",
  "Sanity / CMS Build",
] as const;

const BUDGET_OPTIONS = [
  { label: "$3k–$5k", value: "3-5k" },
  { label: "$5k–$10k", value: "5-10k" },
  { label: "$10k–$25k", value: "10-25k" },
  { label: "$25k+", value: "25k+" },
] as const;

const TIMELINE_OPTIONS = [
  { label: "ASAP (2–4 weeks)", value: "asap" },
  { label: "1–2 months", value: "1-2mo" },
  { label: "3+ months", value: "3mo+" },
] as const;

type TimelineValue = (typeof TIMELINE_OPTIONS)[number]["value"];
type BudgetOption = "3-5k" | "5-10k" | "10-25k" | "25+";

export default function FitSection() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [services, setServices] = useState<string[]>(["Interactive Website"]);
  const [message, setMessage] = useState("");
  const [timeline, setTimeline] = useState<TimelineValue>(TIMELINE_OPTIONS[0].value);
  const [budget, setBudget] = useState<BudgetOption>("5-10k");

  // honeypot
  const [honey, setHoney] = useState("");

  const successRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.trim().length >= 5 &&
      services.length >= 1 &&
      message.trim().length >= 10 &&
      !loading
    );
  }, [name, email, services.length, message, loading]);

  const toggleService = (s: string) => {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!canSubmit) {
      setErr("Please fill in the required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          budget,
          timeline,
          services,
          message,
          honey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setOk(false);
        setErr(data?.error || "Something went wrong.");
      } else {
        setOk(true);

        // clear form
        setName("");
        setEmail("");
        setCompany("");
        setWebsite("");
        setServices(["Interactive Website"]);
        setMessage("");

        // tiny premium haptic on mobile (optional)
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            // subtle pattern: not a buzzsaw
            navigator.vibrate([18, 22, 18]);
          }
        } catch {}

        // focus the success panel for accessibility
        setTimeout(() => successRef.current?.focus(), 50);
      }
    } catch {
      setOk(false);
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const reset = () => {
    setOk(null);
    setErr(null);
  };

  return (
    <section id="fit" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">Fit</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Let’s see if we’re a fit.
          </h2>
          <p className="mt-4 text-white/70">
            Give me a clear scope and budget. I’ll respond with next steps and a build plan.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs tracking-[0.25em] uppercase text-white/55">
              What happens next
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li>• I review scope + budget.</li>
              <li>• You get a quick reply with direction and timeline.</li>
              <li>• If it’s a match, we schedule a call.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {ok === true ? (
              <motion.div
                key="success"
                ref={(el) => {
                  successRef.current = el;
                }}
                tabIndex={-1}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 backdrop-blur p-6 outline-none"
                aria-live="polite"
              >
                {/* ambient scan */}
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 w-40"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)",
                    mixBlendMode: "screen",
                  }}
                  initial={{ x: -180, opacity: 0 }}
                  animate={{ x: 680, opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.55, ease: "linear" }}
                />

                {/* subtle pulse dot */}
                <div className="flex items-center gap-3">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-[rgb(var(--accent))]"
                    animate={{ opacity: [0.25, 0.65, 0.25] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="text-xs tracking-[0.25em] uppercase text-white/60">
                    Transmission
                  </div>
                </div>

                <div className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Signal sent ✅
                </div>

                <p className="mt-3 text-white/70 max-w-xl">
                  Your Fit request just hit the queue. I’ll reply with next steps and a build plan.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MiniStat label="Status" value="Queued" />
                  <MiniStat label="Priority" value="Focused" />
                  <MiniStat label="Response" value="Soon" />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10 transition-colors"
                  >
                    Send another →
                  </button>

                  <a
                    href="/work"
                    className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/15 transition-colors"
                  >
                    View Work →
                  </a>

                  <a
                    href="/#top"
                    className="text-sm text-white/65 hover:text-white transition-colors"
                  >
                    Back to top
                  </a>
                </div>

                <div className="mt-4 text-xs text-white/45">
                  Tip: If you forgot something, reply to your confirmation email.
                </div>

                {/* soft gloss */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0" />
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
              >
                {/* honeypot */}
                <div className="hidden">
                  <label>Leave this empty</label>
                  <input value={honey} onChange={(e) => setHoney(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Name *" htmlFor="fit-name">
                    <input
                      id="fit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </Field>

                  <Field label="Email *" htmlFor="fit-email">
                    <input
                      id="fit-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="Company" htmlFor="fit-company">
                    <input
                      id="fit-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                      placeholder="Your Company"
                      autoComplete="organization"
                    />
                  </Field>

                  <Field label="Website" htmlFor="fit-website">
                    <input
                      id="fit-website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                      placeholder="https://..."
                      autoComplete="url"
                    />
                  </Field>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Budget *" htmlFor="fit-budget">
                    <select
                      id="fit-budget"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value as BudgetOption)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                    >
                      {BUDGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-black">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Timeline *" htmlFor="fit-timeline">
                    <select
                      id="fit-timeline"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value as TimelineValue)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                    >
                      {TIMELINE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-black">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-6">
                  <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                    Services *
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((s) => {
                      const selected = services.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleService(s)}
                          className={[
                            "rounded-full border px-4 py-2 text-sm transition-colors",
                            selected
                              ? "border-white/30 bg-white/10 text-[rgb(var(--accent))]"
                              : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <Field label="Project details *" htmlFor="fit-message">
                    <textarea
                      id="fit-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/25"
                      placeholder="What are we building? Who is it for? Any must-haves? Any examples you like?"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                      "rounded-full px-6 py-3 text-sm transition-colors",
                      canSubmit
                        ? "border border-white/25 bg-white/10 text-white hover:bg-[rgb(var(--accent))]/100"
                        : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {loading ? "Sending…" : "Send Fit Request"}
                  </button>

                  {ok === false ? (
                    <span className="text-sm text-white/70">{err ?? "Error"}</span>
                  ) : null}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  // Using div wrapper helps avoid hydration diff from password managers injecting into labels.
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs tracking-[0.25em] uppercase text-white/55"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] tracking-[0.25em] uppercase text-white/50">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/85">{value}</div>
    </div>
  );
}
