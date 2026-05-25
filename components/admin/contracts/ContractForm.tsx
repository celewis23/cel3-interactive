"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type ContractClientOption = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  portalUserId: string | null;
};

interface Props {
  templates: Template[];
  clients?: ContractClientOption[];
}

export default function ContractForm({ templates, clients = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Core fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [pipelineContactId, setPipelineContactId] = useState("");
  const [stripeCustomerId, setStripeCustomerId] = useState("");
  const [portalUserId, setPortalUserId] = useState("");
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
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  useEffect(() => {
    const pipelineId = searchParams.get("pipelineContactId") ?? "";
    const matchedClient = clients.find((client) => client._id === pipelineId) ?? null;
    setClientName(searchParams.get("clientName") ?? matchedClient?.name ?? "");
    setClientEmail(searchParams.get("clientEmail") ?? matchedClient?.email ?? "");
    setClientCompany(searchParams.get("clientCompany") ?? matchedClient?.company ?? "");
    setPipelineContactId(pipelineId);
    setStripeCustomerId(searchParams.get("stripeCustomerId") ?? matchedClient?.stripeCustomerId ?? "");
    setPortalUserId(searchParams.get("portalUserId") ?? matchedClient?.portalUserId ?? "");
    setProjectName(searchParams.get("projectName") ?? "");
  }, [clients, searchParams]);

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

  const selectedClient = useMemo(
    () => clients.find((client) => client._id === pipelineContactId) ?? null,
    [clients, pipelineContactId]
  );

  const filteredClients = useMemo(() => {
    const query = clientName.trim().toLowerCase();
    const list = query
      ? clients.filter((client) => {
          const haystack = [client.name, client.email, client.company].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(query);
        })
      : clients;
    return list.slice(0, 8);
  }, [clientName, clients]);

  function selectClient(client: ContractClientOption) {
    setClientName(client.name ?? "");
    setClientEmail(client.email ?? "");
    setClientCompany(client.company ?? "");
    setPipelineContactId(client._id);
    setStripeCustomerId(client.stripeCustomerId ?? "");
    setPortalUserId(client.portalUserId ?? "");
    setClientPickerOpen(false);
  }

  function clearSelectedClient() {
    setPipelineContactId("");
    setStripeCustomerId("");
    setPortalUserId("");
  }

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
          pipelineContactId: pipelineContactId || null,
          stripeCustomerId: stripeCustomerId || null,
          portalUserId: portalUserId || null,
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
          <div className="relative">
            <input
              type="text"
              value={clientName}
              onFocus={() => setClientPickerOpen(true)}
              onChange={(e) => {
                setClientName(e.target.value);
                setClientPickerOpen(true);
              }}
              onBlur={() => window.setTimeout(() => setClientPickerOpen(false), 140)}
              placeholder="Search or type a client name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-24 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setClientPickerOpen((open) => !open)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] text-white/55 hover:bg-white/12 hover:text-white/80"
            >
              Clients
            </button>
            {clientPickerOpen && clients.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl border border-white/10 bg-[#090d14] shadow-2xl">
                {filteredClients.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto py-1">
                    {filteredClients.map((client) => (
                      <button
                        key={client._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectClient(client)}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sky-500/10"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-200">
                          {(client.name || client.company || client.email || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white/86">{client.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-white/38">
                            {[client.company, client.email].filter(Boolean).join(" - ") || "No additional client details"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-xs text-white/40">No matching clients. You can keep typing to create the contract manually.</div>
                )}
              </div>
            )}
          </div>
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-sky-500/15 bg-sky-500/8 px-3 py-2">
              <p className="min-w-0 truncate text-xs text-sky-100/72">
                Linked to {selectedClient.name}{selectedClient.company ? ` - ${selectedClient.company}` : ""}
              </p>
              <button type="button" onClick={clearSelectedClient} className="shrink-0 text-[11px] text-white/42 hover:text-white/75">
                Unlink
              </button>
            </div>
          )}
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
