"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "web-design", label: "Web Design Client" },
  { value: "coaching", label: "Coaching Client" },
  { value: "retainer", label: "Retainer Client" },
  { value: "ecommerce", label: "E-Commerce Client" },
  { value: "consulting", label: "Consulting Client" },
];

const ACTION_TYPES = [
  { value: "manual", label: "Manual / No action" },
  { value: "send-contract", label: "Send Contract" },
  { value: "send-estimate", label: "Send Estimate" },
  { value: "schedule-call", label: "Schedule Kickoff Call" },
  { value: "create-project", label: "Create Project" },
  { value: "request-file", label: "Request File Upload" },
  { value: "invite-portal", label: "Invite to Client Portal" },
];

interface Step {
  _key: string;
  order: number;
  title: string;
  description: string;
  dueDateOffsetDays: string;
  actionType: string;
}

interface TemplateData {
  _id?: string;
  name?: string;
  description?: string;
  category?: string;
  steps?: Step[];
}

interface Props {
  initial?: TemplateData;
}

function newStep(order: number): Step {
  return {
    _key: crypto.randomUUID(),
    order,
    title: "",
    description: "",
    dueDateOffsetDays: "",
    actionType: "manual",
  };
}

export default function TemplateBuilder({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [steps, setSteps] = useState<Step[]>(
    initial?.steps?.map((s) => ({
      _key: s._key,
      order: s.order,
      title: s.title,
      description: s.description ?? "",
      dueDateOffsetDays: s.dueDateOffsetDays != null ? String(s.dueDateOffsetDays) : "",
      actionType: s.actionType ?? "manual",
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps((prev) => [...prev, newStep(prev.length)]);
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, order: i })));
  }

  function moveStep(key: string, dir: -1 | 1) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s._key === key);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  function updateStep(key: string, field: keyof Step, value: string) {
    setSteps((prev) =>
      prev.map((s) => (s._key === key ? { ...s, [field]: value } : s))
    );
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        steps: steps.map((s, i) => ({
          _key: s._key,
          order: i,
          title: s.title.trim(),
          description: s.description.trim() || null,
          dueDateOffsetDays: s.dueDateOffsetDays !== "" ? Number(s.dueDateOffsetDays) : null,
          actionType: s.actionType,
        })),
      };

      const url = initial?._id
        ? `/api/admin/onboarding/templates/${initial._id}`
        : "/api/admin/onboarding/templates";
      const method = initial?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save.");
        return;
      }
      router.push("/admin/onboarding/templates");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Name + Category + Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Web Design Client Onboarding"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Client Type
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0f0f0f]">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this onboarding flow…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
        />
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Steps ({steps.length})
          </label>
          <button
            type="button"
            onClick={addStep}
            className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
          >
            + Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-white/25 text-sm">
            No steps yet. Click &ldquo;Add Step&rdquo; to build your checklist.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step._key}
                className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3"
              >
                {/* Step header */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 font-mono w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(step._key, "title", e.target.value)}
                      placeholder="Step title…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStep(step._key, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l-8 8h6v8h4v-8h6z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(step._key, 1)}
                      disabled={idx === steps.length - 1}
                      className="p-1.5 rounded text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                      title="Move down"
                    >
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 20l8-8h-6V4h-4v8H4z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(step._key)}
                      className="p-1.5 rounded text-red-400/40 hover:text-red-400 transition-colors"
                      title="Remove step"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Step details */}
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => updateStep(step._key, "description", e.target.value)}
                      placeholder="Optional description or instructions…"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/30 mb-1">Due offset (days)</label>
                    <input
                      type="number"
                      value={step.dueDateOffsetDays}
                      onChange={(e) => updateStep(step._key, "dueDateOffsetDays", e.target.value)}
                      placeholder="e.g. 3"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white/30 mb-1">Linked action</label>
                    <select
                      value={step.actionType}
                      onChange={(e) => updateStep(step._key, "actionType", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400/50 appearance-none"
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value} className="bg-[#0f0f0f]">
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving…" : initial?._id ? "Save Changes" : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
