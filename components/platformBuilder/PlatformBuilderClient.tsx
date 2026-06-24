"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { PlatformBuilderResult, PlatformBuilderSection, PlatformContactInput } from "@/lib/platformBuilder/types";

type Props = {
  sections: PlatformBuilderSection[];
};

const initialContact: PlatformContactInput = {
  firstName: "",
  lastName: "",
  businessName: "",
  email: "",
  phone: "",
  budgetComfortRange: "",
  desiredTimeline: "",
  projectNotes: "",
  website: "",
  businessType: "",
  preferredContactMethod: "Email",
};

const budgetOptions = [
  "Under $2,500",
  "$2,500 - $7,500",
  "$7,500 - $15,000",
  "$15,000 - $30,000",
  "$30,000+",
  "I need guidance",
];

const timelineOptions = [
  "As soon as possible",
  "Within 30 days",
  "1 - 3 months",
  "3 - 6 months",
  "Flexible",
];

export function PlatformBuilderClient({ sections }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id);
  const [contact, setContact] = useState<PlatformContactInput>(initialContact);
  const [result, setResult] = useState<PlatformBuilderResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedFeatures = useMemo(() => {
    const featureMap = new Map(sections.flatMap((section) => section.features.map((feature) => [feature.id, feature] as const)));
    return selectedIds.map((id) => featureMap.get(id)).filter((feature): feature is NonNullable<typeof feature> => Boolean(feature));
  }, [sections, selectedIds]);

  const direction = useMemo(() => getGeneralDirection(selectedFeatures), [selectedFeatures]);
  const roughLabel = useMemo(() => getRoughPackageLabel(selectedFeatures), [selectedFeatures]);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  function toggleFeature(id: string) {
    setResult(null);
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function updateContact(field: keyof PlatformContactInput, value: string) {
    setContact((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (selectedIds.length === 0) {
      setError("Select at least one feature before generating a proposal.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads/platform-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedFeatureIds: selectedIds, contact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate proposal.");
      setResult(data);
      setDrawerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <section className="relative overflow-hidden pt-28 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
        <div className="relative mx-auto max-w-7xl px-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Build Your Platform</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Pick the pieces. CEL3 turns them into a platform plan.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
              Select the business tools, AI workflows, ecommerce pieces, mobile experiences, and custom systems that fit where your business is going.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a href="#builder" className="rounded-full bg-sky-400 px-5 py-3 font-semibold text-black transition-colors hover:bg-sky-300">
              Start Building
            </a>
            <a href="#proposal-form" className="rounded-full border border-white/16 px-5 py-3 text-white/75 transition-colors hover:border-sky-300/50 hover:text-sky-200">
              Generate My Proposal
            </a>
          </div>
        </div>
      </section>

      <main id="builder" className="mx-auto grid max-w-7xl gap-7 px-5 pb-24 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="sticky top-[72px] z-20 -mx-5 border-y border-white/8 bg-[#05070a]/88 px-5 py-3 backdrop-blur lg:top-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={[
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                    activeSection.id === section.id
                      ? "border-sky-300/60 bg-sky-300/14 text-sky-100"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  {index + 1}. {section.title}
                </button>
              ))}
            </div>
          </div>

          <section className="pt-8">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">{activeSection.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{activeSection.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{activeSection.description}</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/50">
                {selectedFeatures.length} selected
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {activeSection.features.map((feature) => {
                const selected = selectedIds.includes(feature.id);
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => toggleFeature(feature.id)}
                    className={[
                      "group min-h-[236px] rounded-2xl border p-5 text-left transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-sky-300/40",
                      selected
                        ? "border-sky-300/70 bg-sky-300/12 shadow-[0_0_40px_rgba(56,189,248,0.12)]"
                        : "border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.055]",
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={[
                        "flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-bold uppercase",
                        selected ? "border-sky-300/60 bg-sky-300/18 text-sky-100" : "border-white/12 bg-black/20 text-white/55",
                      ].join(" ")}>
                        {feature.icon.slice(0, 2)}
                      </div>
                      <span className={[
                        "rounded-full px-3 py-1 text-[11px] font-semibold",
                        selected ? "bg-sky-300 text-black" : "bg-white/8 text-white/42",
                      ].join(" ")}>
                        {selected ? "Added to your platform" : feature.estimatedImpact}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/58">{feature.description}</p>
                    <p className="mt-4 text-sm leading-6 text-sky-100/78">{feature.benefit}</p>
                    {feature.recommendedFor ? (
                      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-white/34">
                        Recommended for {feature.recommendedFor}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setActiveSectionId(sections[Math.max(sections.findIndex((section) => section.id === activeSection.id) - 1, 0)].id)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/55 transition-colors hover:border-white/20 hover:text-white"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionId(sections[Math.min(sections.findIndex((section) => section.id === activeSection.id) + 1, sections.length - 1)].id)}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-sky-200"
              >
                Next Section
              </button>
            </div>
          </section>

          <section id="proposal-form" className="mt-14 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Your Platform Is Ready</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Enter your information and we will generate a professional proposal based on your selections.</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Final pricing, timeline, and the downloadable proposal are generated server-side after this step.
              </p>
            </div>

            <form onSubmit={submit} className="mt-7 grid gap-4 md:grid-cols-2">
              <Field label="First name" value={contact.firstName} onChange={(value) => updateContact("firstName", value)} required />
              <Field label="Last name" value={contact.lastName} onChange={(value) => updateContact("lastName", value)} required />
              <Field label="Business name" value={contact.businessName} onChange={(value) => updateContact("businessName", value)} required />
              <Field label="Email" type="email" value={contact.email} onChange={(value) => updateContact("email", value)} required />
              <Field label="Phone" value={contact.phone} onChange={(value) => updateContact("phone", value)} required />
              <Field label="Website" value={contact.website ?? ""} onChange={(value) => updateContact("website", value)} />
              <Field label="Business type" value={contact.businessType ?? ""} onChange={(value) => updateContact("businessType", value)} />
              <SelectField label="Preferred contact" value={contact.preferredContactMethod ?? "Email"} onChange={(value) => updateContact("preferredContactMethod", value)} options={["Email", "Phone", "Text", "No preference"]} />
              <SelectField label="Budget comfort range" value={contact.budgetComfortRange} onChange={(value) => updateContact("budgetComfortRange", value)} options={budgetOptions} required />
              <SelectField label="Desired timeline" value={contact.desiredTimeline} onChange={(value) => updateContact("desiredTimeline", value)} options={timelineOptions} required />
              <label className="md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Project notes</span>
                <textarea
                  required
                  value={contact.projectNotes}
                  onChange={(event) => updateContact("projectNotes", event.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-300/60"
                  placeholder="Tell us what you are building, what is not working today, and what matters most."
                />
              </label>
              {error ? (
                <div className="md:col-span-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}
              <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Generating Proposal..." : "Generate My Proposal"}
                </button>
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/12 px-6 py-3 text-center text-sm text-white/70 transition-colors hover:border-sky-300/50 hover:text-sky-200"
                >
                  Schedule Discovery Call
                </Link>
              </div>
            </form>
          </section>

          {result ? (
            <section className="mt-8 rounded-3xl border border-sky-300/25 bg-sky-300/10 p-5 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Proposal Generated</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{result.recommendedPackage}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ResultMetric label="Setup investment" value={result.setupInvestmentRange} />
                <ResultMetric label="Monthly investment" value={result.monthlyInvestmentRange} />
                <ResultMetric label="Timeline estimate" value={result.timelineEstimate} />
              </div>
              <p className="mt-5 text-sm leading-6 text-white/70">{result.aiUsageRecommendation}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={result.proposalDownloadUrl} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-sky-100">
                  Download Proposal PDF
                </a>
                <Link href="/assessment" className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/78 transition-colors hover:border-white/35 hover:text-white">
                  Schedule Discovery Call
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <SummaryPanel
            selectedFeatures={selectedFeatures}
            direction={direction}
            roughLabel={roughLabel}
            result={result}
          />
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#05070a]/94 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-white">Platform Summary</span>
            <span className="block text-xs text-white/45">{selectedFeatures.length} selected - {direction}</span>
          </span>
          <span className="text-sm text-sky-200">{drawerOpen ? "Close" : "Open"}</span>
        </button>
        {drawerOpen ? (
          <div className="mt-3 max-h-[62vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4">
            <SummaryPanel
              selectedFeatures={selectedFeatures}
              direction={direction}
              roughLabel={roughLabel}
              result={result}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryPanel({
  selectedFeatures,
  direction,
  roughLabel,
  result,
}: {
  selectedFeatures: Array<PlatformBuilderSection["features"][number]>;
  direction: string;
  roughLabel: string;
  result: PlatformBuilderResult | null;
}) {
  return (
    <div className="sticky top-24 rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Platform Summary</p>
      <h2 className="mt-3 text-xl font-semibold text-white">Your recommendation is ready.</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
          <p className="text-xs text-white/40">Features</p>
          <p className="mt-1 text-2xl font-semibold text-white">{selectedFeatures.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
          <p className="text-xs text-white/40">Direction</p>
          <p className="mt-1 text-sm font-semibold text-white">{direction}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-4">
        <p className="text-xs text-white/40">General platform direction</p>
        <p className="mt-1 text-sm font-semibold text-white">{roughLabel}</p>
      </div>
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
        {selectedFeatures.length ? selectedFeatures.map((feature) => (
          <div key={feature.id} className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <p className="text-sm font-medium text-white">{feature.title}</p>
            <p className="text-xs text-white/38">{feature.estimatedImpact}</p>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-white/12 px-3 py-6 text-center text-sm text-white/38">
            Select cards to build your platform.
          </p>
        )}
      </div>
      {!result ? (
        <a href="#proposal-form" className="mt-5 block rounded-full bg-sky-400 px-5 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-sky-300">
          Generate My Proposal
        </a>
      ) : (
        <div className="mt-5 rounded-2xl border border-sky-300/25 bg-sky-300/10 p-4">
          <p className="text-xs text-sky-100/70">Recommended package</p>
          <p className="mt-1 font-semibold text-white">{result.recommendedPackage}</p>
          <a href={result.proposalDownloadUrl} className="mt-4 block rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black">
            Download Proposal PDF
          </a>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-300/60"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</span>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-sky-300/60"
      >
        <option value="">Select one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function getGeneralDirection(features: Array<PlatformBuilderSection["features"][number]>) {
  if (features.length === 0) return "Not selected yet";
  const tags = new Set(features.flatMap((feature) => feature.tags));
  if (tags.has("native")) return "Mobile app platform";
  if (tags.has("custom")) return "Custom operating system";
  if (tags.has("ecommerce")) return "Online sales system";
  if (tags.has("ai")) return "AI-assisted platform";
  if (tags.has("platform")) return "Business platform";
  return "Website foundation";
}

function getRoughPackageLabel(features: Array<PlatformBuilderSection["features"][number]>) {
  if (features.length === 0) return "Select a few cards to shape the recommendation.";
  const tags = new Set(features.flatMap((feature) => feature.tags));
  if (tags.has("native")) return "Likely mobile-app-first platform";
  if (tags.has("custom") || features.length >= 14) return "Likely advanced custom platform";
  if (tags.has("ecommerce")) return "Likely ecommerce business system";
  if (tags.has("ai") || features.length >= 9) return "Likely pro business platform";
  if (tags.has("platform")) return "Likely business platform";
  return "Likely website foundation";
}
