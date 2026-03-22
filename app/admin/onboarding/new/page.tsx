"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Template {
  _id: string;
  name: string;
  category: string;
  steps: Array<{ _key: string; title: string; dueDateOffsetDays: number | null }>;
}

function NewOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState(searchParams.get("templateId") ?? "");
  const [clientName, setClientName] = useState(searchParams.get("clientName") ?? "");
  const [clientEmail, setClientEmail] = useState(searchParams.get("clientEmail") ?? "");
  const [clientCompany, setClientCompany] = useState(searchParams.get("clientCompany") ?? "");
  const [pipelineContactId, setPipelineContactId] = useState(searchParams.get("pipelineContactId") ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/onboarding/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const selectedTemplate = templates.find((t) => t._id === templateId);

  async function handleSave() {
    setError(null);
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateId || null,
          templateName: selectedTemplate?.name || null,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || null,
          clientCompany: clientCompany.trim() || null,
          pipelineContactId: pipelineContactId.trim() || null,
          startDate,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create onboarding.");
        return;
      }
      const created = await res.json();
      router.push(`/admin/onboarding/${created._id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Onboarding</div>
        <h1 className="text-2xl font-bold text-white">Start Onboarding</h1>
      </div>

      {/* Template selector */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Checklist Template
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
        >
          <option value="" className="bg-[#0f0f0f]">— No template (blank checklist) —</option>
          {templates.map((t) => (
            <option key={t._id} value={t._id} className="bg-[#0f0f0f]">
              {t.name}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <div className="mt-2 text-xs text-white/30">
            {selectedTemplate.steps?.length ?? 0} steps will be added
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Client Name *
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Client Email
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Company
          </label>
          <input
            type="text"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
            placeholder="Company name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Internal Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50 resize-none"
        />
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
          {saving ? "Creating…" : "Start Onboarding"}
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

export default function NewOnboardingPage() {
  return (
    <Suspense>
      <NewOnboardingForm />
    </Suspense>
  );
}
