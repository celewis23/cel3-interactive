"use client";
import { useState } from "react";

type Settings = {
  // Hero
  heroHeadline?: string;
  heroSubheadline?: string;
  heroDescription?: string;
  heroCtaPrimary?: string;
  heroCtaSecondary?: string;
  // Approach
  approachHeading?: string;
  approachCard1Title?: string;
  approachCard1Body?: string;
  approachCard2Title?: string;
  approachCard2Body?: string;
  approachCard3Title?: string;
  approachCard3Body?: string;
  // Capabilities
  capabilitiesTitle?: string;
  cap1Title?: string;
  cap1Body?: string;
  cap2Title?: string;
  cap2Body?: string;
  cap3Title?: string;
  cap3Body?: string;
  cap4Title?: string;
  cap4Body?: string;
  // Fit CTA
  fitCtaHeadline?: string;
  // Who We Work With
  whoHeadline?: string;
  // Working Together
  process1Title?: string;
  process1Body?: string;
  process2Title?: string;
  process2Body?: string;
  process3Title?: string;
  process3Body?: string;
  // Fit form
  fitTitle?: string;
  // Footer
  footerTagline?: string;
};

const DEFAULTS: Settings = {
  heroHeadline: "Design That Responds.",
  heroSubheadline: "We build interactive digital systems for businesses ready to invest in forward-thinking technology.",
  heroDescription: "$150, book your time, and get a clear systems roadmap tailored to your business.",
  heroCtaPrimary: "Start With an Assessment",
  heroCtaSecondary: "View Work",
  approachHeading: "Interfaces that feel alive",
  approachCard1Title: "Respond",
  approachCard1Body: "Interfaces that acknowledge intent",
  approachCard2Title: "Adapt",
  approachCard2Body: "Layouts that adapt in real time",
  approachCard3Title: "Evolve",
  approachCard3Body: "Systems that surface state",
  capabilitiesTitle: "What We Build",
  cap1Title: "Interactive Experiences",
  cap1Body: "Digital experiences that react to user motion",
  cap2Title: "Web Applications & Platforms",
  cap2Body: "Custom platforms for real-world use",
  cap3Title: "Data & Intelligent Interfaces",
  cap3Body: "Interfaces transforming data into clarity",
  cap4Title: "AI-Enhanced Systems",
  cap4Body: "Smarter interactions with intelligent logic",
  fitCtaHeadline: "If this feels aligned, we should talk.",
  whoHeadline: "We partner with revenue-generating teams",
  process1Title: "01. Discovery",
  process1Body: "We learn your business, goals, and constraints before writing a line of code.",
  process2Title: "02. Design & Build",
  process2Body: "We build iteratively, showing you real progress at every step.",
  process3Title: "03. Launch & Evolve",
  process3Body: "We ship, measure, and continue improving what we've built together.",
  fitTitle: "Let's see if we're a fit.",
  footerTagline: "We build interactive digital systems for businesses ready to invest in forward-thinking technology.",
};

function merge(initial: Settings): Settings {
  const out: Settings = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    if (initial[key] !== undefined && initial[key] !== null && initial[key] !== "") {
      out[key] = initial[key];
    }
  }
  return out;
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
      <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
};

function Field({ label, value, onChange, multiline, placeholder }: FieldProps) {
  const cls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors";
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1.5 tracking-wide">{label}</label>
      {multiline ? (
        <textarea
          className={`${cls} min-h-[72px] resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export default function ContentEditor({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(merge(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof Settings) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Section title="Hero Section">
        <Field label="Headline" value={form.heroHeadline!} onChange={set("heroHeadline")} placeholder="Design That Responds." />
        <Field label="Subheadline" value={form.heroSubheadline!} onChange={set("heroSubheadline")} multiline />
        <Field label="Description / Assessment blurb" value={form.heroDescription!} onChange={set("heroDescription")} multiline />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary CTA label" value={form.heroCtaPrimary!} onChange={set("heroCtaPrimary")} placeholder="Start With an Assessment" />
          <Field label="Secondary CTA label" value={form.heroCtaSecondary!} onChange={set("heroCtaSecondary")} placeholder="View Work" />
        </div>
      </Section>

      <Section title="Interactive by Design (Approach)">
        <Field label="Section heading" value={form.approachHeading!} onChange={set("approachHeading")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Field label="Card 1 title" value={form.approachCard1Title!} onChange={set("approachCard1Title")} />
            <Field label="Card 1 body" value={form.approachCard1Body!} onChange={set("approachCard1Body")} />
          </div>
          <div className="space-y-2">
            <Field label="Card 2 title" value={form.approachCard2Title!} onChange={set("approachCard2Title")} />
            <Field label="Card 2 body" value={form.approachCard2Body!} onChange={set("approachCard2Body")} />
          </div>
          <div className="space-y-2">
            <Field label="Card 3 title" value={form.approachCard3Title!} onChange={set("approachCard3Title")} />
            <Field label="Card 3 body" value={form.approachCard3Body!} onChange={set("approachCard3Body")} />
          </div>
        </div>
      </Section>

      <Section title="Capability Matrix (What We Build)">
        <Field label="Section title" value={form.capabilitiesTitle!} onChange={set("capabilitiesTitle")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Field label="Tab 1 title" value={form.cap1Title!} onChange={set("cap1Title")} />
            <Field label="Tab 1 description" value={form.cap1Body!} onChange={set("cap1Body")} multiline />
          </div>
          <div className="space-y-2">
            <Field label="Tab 2 title" value={form.cap2Title!} onChange={set("cap2Title")} />
            <Field label="Tab 2 description" value={form.cap2Body!} onChange={set("cap2Body")} multiline />
          </div>
          <div className="space-y-2">
            <Field label="Tab 3 title" value={form.cap3Title!} onChange={set("cap3Title")} />
            <Field label="Tab 3 description" value={form.cap3Body!} onChange={set("cap3Body")} multiline />
          </div>
          <div className="space-y-2">
            <Field label="Tab 4 title" value={form.cap4Title!} onChange={set("cap4Title")} />
            <Field label="Tab 4 description" value={form.cap4Body!} onChange={set("cap4Body")} multiline />
          </div>
        </div>
      </Section>

      <Section title="Fit CTA Banner">
        <Field label="Headline" value={form.fitCtaHeadline!} onChange={set("fitCtaHeadline")} placeholder="If this feels aligned, we should talk." />
      </Section>

      <Section title="Who We Work With">
        <Field label="Headline" value={form.whoHeadline!} onChange={set("whoHeadline")} placeholder="We partner with revenue-generating teams" />
      </Section>

      <Section title="Working Together (Process)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Field label="Step 1 title" value={form.process1Title!} onChange={set("process1Title")} />
            <Field label="Step 1 description" value={form.process1Body!} onChange={set("process1Body")} multiline />
          </div>
          <div className="space-y-2">
            <Field label="Step 2 title" value={form.process2Title!} onChange={set("process2Title")} />
            <Field label="Step 2 description" value={form.process2Body!} onChange={set("process2Body")} multiline />
          </div>
          <div className="space-y-2">
            <Field label="Step 3 title" value={form.process3Title!} onChange={set("process3Title")} />
            <Field label="Step 3 description" value={form.process3Body!} onChange={set("process3Body")} multiline />
          </div>
        </div>
      </Section>

      <Section title="Fit Form">
        <Field label="Section title" value={form.fitTitle!} onChange={set("fitTitle")} placeholder="Let's see if we're a fit." />
      </Section>

      <Section title="Footer">
        <Field label="Tagline / description" value={form.footerTagline!} onChange={set("footerTagline")} multiline />
      </Section>

      <div className="sticky bottom-4 z-10">
        <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-3 shadow-xl">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-sky-400">Saved!</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
          <span className="ml-auto text-xs text-white/25">
            Changes go live after the site rebuilds (up to 60s)
          </span>
        </div>
      </div>
    </form>
  );
}
