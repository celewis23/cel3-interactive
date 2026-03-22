"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["service-agreement", "nda", "proposal", "scope", "retainer", "other"];

const STANDARD_VARS = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "projectName",
  "contractNumber",
  "contractDate",
  "startDate",
  "endDate",
  "totalAmount",
  "paymentTerms",
];

interface Template {
  _id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
}

interface Props {
  templates: Template[];
}

export default function ContractForm({ templates }: Props) {
  const router = useRouter();

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Core fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  // Variable overrides (standard + custom)
  const [vars, setVars] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null);
      return;
    }
    const t = templates.find((t) => t._id === selectedTemplateId) ?? null;
    setSelectedTemplate(t);
    if (t) setCategory(t.category);
  }, [selectedTemplateId, templates]);

  const extraVars = selectedTemplate?.variables?.filter(
    (v) => !STANDARD_VARS.includes(v)
  ) ?? [];

  async function handleSave() {
    setError(null);
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!selectedTemplateId && !vars.body) {
      setError("Please select a template.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId || null,
          templateName: selectedTemplate?.name || null,
          category,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || null,
          clientCompany: clientCompany.trim() || null,
          projectName: projectName.trim() || null,
          date,
          expiryDate,
          notes: notes.trim() || null,
          body: selectedTemplate?.body ?? "",
          variables: {
            startDate: vars.startDate ?? "",
            endDate: vars.endDate ?? "",
            totalAmount: vars.totalAmount ?? "",
            paymentTerms: vars.paymentTerms ?? "",
            ...vars,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create contract.");
        return;
      }
      const created = await res.json();
      router.push(`/admin/contracts/${created._id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Template
        </label>
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
        >
          <option value="" className="bg-[#0f0f0f]">— Select a template —</option>
          {templates.map((t) => (
            <option key={t._id} value={t._id} className="bg-[#0f0f0f]">
              {t.name}
            </option>
          ))}
        </select>
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
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
      </div>

      {/* Category + Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#0f0f0f]">
                {c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Contract Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Expiry Date
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
      </div>

      {/* Standard variable overrides */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">
          Variable Values
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "startDate", label: "Start Date", type: "date" },
            { key: "endDate", label: "End Date", type: "date" },
            { key: "totalAmount", label: "Total Amount", type: "text", placeholder: "e.g. $5,000" },
            { key: "paymentTerms", label: "Payment Terms", type: "text", placeholder: "e.g. Net 30" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1 font-mono">{`{{${key}}}`} — {label}</label>
              <input
                type={type}
                value={vars[key] ?? ""}
                onChange={(e) => setVars((v) => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
              />
            </div>
          ))}
          {extraVars.map((v) => (
            <div key={v}>
              <label className="block text-xs text-white/40 mb-1 font-mono">{`{{${v}}}`}</label>
              <input
                type="text"
                value={vars[v] ?? ""}
                onChange={(e) => setVars((prev) => ({ ...prev, [v]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Internal Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes (not visible to client)…"
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
          {saving ? "Creating…" : "Create Contract"}
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
