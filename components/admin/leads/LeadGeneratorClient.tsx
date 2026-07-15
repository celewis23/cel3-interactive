"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  LeadCandidate,
  LeadCandidateStatus,
  LeadGeneratorSettings,
} from "@/lib/leads/types";
import {
  DEFAULT_LEAD_SEARCH_CATEGORIES,
  DEFAULT_LEAD_SEARCH_LOCATIONS,
} from "@/lib/leads/searchCriteria";

const STATUS_OPTIONS: Array<{ id: LeadCandidateStatus | "all"; label: string }> = [
  { id: "review", label: "Review" },
  { id: "sent", label: "Sent" },
  { id: "approved", label: "Approved" },
  { id: "contacted", label: "Contacted" },
  { id: "followed-up", label: "Followed Up" },
  { id: "meeting", label: "Meeting" },
  { id: "closed", label: "Closed" },
  { id: "lost", label: "Lost" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const WEEKDAYS = [
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
  { id: 7, label: "Sunday" },
];

function statusClass(status: string) {
  if (status === "review") return "bg-amber-400/10 text-amber-300";
  if (status === "sent" || status === "contacted" || status === "followed-up") return "bg-sky-400/10 text-sky-300";
  if (status === "approved" || status === "meeting" || status === "closed") return "bg-emerald-400/10 text-emerald-300";
  if (status === "lost" || status === "rejected") return "bg-white/6 text-white/35";
  return "bg-white/6 text-white/50";
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function leadSearchText(lead: LeadCandidate) {
  return [
    lead.businessName,
    lead.niche,
    lead.city,
    lead.region,
    lead.currentSnapshot,
    lead.gapAssessment,
    lead.howCel3CanHelp,
  ].join(" ").toLowerCase();
}

function listToText(values: string[]) {
  return values.join("\n");
}

function textToList(value: string) {
  return Array.from(new Set(
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  ));
}

export default function LeadGeneratorClient({
  initialLeads,
  initialSettings,
}: {
  initialLeads: LeadCandidate[];
  initialSettings: LeadGeneratorSettings;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [settings, setSettings] = useState(initialSettings);
  const [selectedId, setSelectedId] = useState(initialLeads[0]?._id ?? "");
  const [statusFilter, setStatusFilter] = useState<LeadCandidateStatus | "all">("review");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const statusMatch = statusFilter === "all" || lead.status === statusFilter;
      const queryMatch = !q || leadSearchText(lead).includes(q);
      return statusMatch && queryMatch;
    });
  }, [leads, query, statusFilter]);

  const selected = leads.find((lead) => lead._id === selectedId) ?? filteredLeads[0] ?? leads[0] ?? null;

  function updateSelected(patch: Partial<LeadCandidate>) {
    if (!selected) return;
    setLeads((prev) => prev.map((lead) => lead._id === selected._id ? { ...lead, ...patch } : lead));
  }

  async function refreshLeads() {
    const res = await fetch("/api/admin/lead-generator/candidates?status=all");
    const data = await res.json();
    if (res.ok) {
      setLeads(data.leads ?? []);
      if (!selectedId && data.leads?.[0]?._id) setSelectedId(data.leads[0]._id);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-generator/candidates/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save lead");
      setLeads((prev) => prev.map((lead) => lead._id === selected._id ? data.lead : lead));
      setMessage("Lead saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setSaving(false);
    }
  }

  async function patchSelected(patch: Partial<LeadCandidate>, successMessage: string) {
    if (!selected) return;
    setBusyAction("patch");
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-generator/candidates/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lead");
      setLeads((prev) => prev.map((lead) => lead._id === selected._id ? data.lead : lead));
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setBusyAction("");
    }
  }

  async function seedLeads() {
    setBusyAction("seed");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/lead-generator/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed leads");
      setLeads(data.leads ?? []);
      setSelectedId(data.leads?.[0]?._id ?? "");
      setMessage(`Seeded ${data.seeded} researched leads.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed leads");
    } finally {
      setBusyAction("");
    }
  }

  async function runFinder() {
    setBusyAction("run");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/lead-generator/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lead search failed");
      setMessage(data.message ?? `Saved ${data.saved ?? 0} leads.`);
      await refreshLeads();
      const settingsRes = await fetch("/api/admin/lead-generator/settings");
      const settingsData = await settingsRes.json();
      if (settingsRes.ok) setSettings(settingsData.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead search failed");
    } finally {
      setBusyAction("");
    }
  }

  async function approveSelected() {
    if (!selected) return;
    setBusyAction("approve");
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-generator/candidates/${selected._id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve lead");
      setLeads((prev) => prev.map((lead) => lead._id === selected._id ? data.lead : lead));
      setMessage("Approved into pipeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve lead");
    } finally {
      setBusyAction("");
    }
  }

  async function rejectSelected() {
    await patchSelected(
      { status: "rejected", reviewedAt: new Date().toISOString() } as Partial<LeadCandidate>,
      "Lead rejected."
    );
  }

  async function sendSelectedEmail() {
    if (!selected) return;
    setBusyAction("send");
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/lead-generator/candidates/${selected._id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selected.emailSubject,
          htmlBody: selected.emailBodyHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      updateSelected({ status: "sent", emailedAt: new Date().toISOString() });
      setMessage("Email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setBusyAction("");
    }
  }

  async function saveSettings() {
    setBusyAction("settings");
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/lead-generator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSettings(data.settings);
      setMessage("Lead generator schedule saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setBusyAction("");
    }
  }

  const activeCount = leads.filter((lead) => !["approved", "rejected", "closed", "lost"].includes(lead.status)).length;
  const reviewCount = leads.filter((lead) => lead.status === "review").length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Lead Generator</h1>
          <p className="mt-1 text-sm text-white/40">
            {reviewCount} in review, {activeCount} active, {leads.length} total captured.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => setCriteriaOpen(true)}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            Search Criteria
          </button>
          <button
            type="button"
            onClick={seedLeads}
            disabled={busyAction === "seed"}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            {busyAction === "seed" ? "Seeding..." : "Seed 20 Researched Leads"}
          </button>
          <button
            type="button"
            onClick={runFinder}
            disabled={busyAction === "run"}
            className="min-h-11 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
          >
            {busyAction === "run" ? "Searching..." : "Run Finder Now"}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          error ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        }`}>
          {error || message}
        </div>
      )}

      {criteriaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="admin-scroll max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#080808] p-4 shadow-2xl sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Search Criteria</h2>
                <p className="mt-1 text-sm text-white/40">
                  Used by Run Finder Now and scheduled lead generation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCriteriaOpen(false)}
                className="min-h-10 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-white/45">Leads per run</span>
                <input
                  type="number"
                  min={20}
                  max={250}
                  value={settings.maxPerRun}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSettings({ ...settings, maxPerRun: Math.min(Math.max(20, value), 250) });
                  }}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
                />
                <span className="mt-1 block text-xs text-white/30">20 minimum, 250 maximum.</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-white/45">Cities, states, ZIP codes</span>
                <textarea
                  value={listToText(settings.searchLocations?.length ? settings.searchLocations : DEFAULT_LEAD_SEARCH_LOCATIONS)}
                  onChange={(event) => setSettings({ ...settings, searchLocations: textToList(event.target.value) })}
                  rows={14}
                  className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm leading-relaxed text-white outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-white/45">Business types</span>
                <textarea
                  value={listToText(settings.searchCategories?.length ? settings.searchCategories : DEFAULT_LEAD_SEARCH_CATEGORIES)}
                  onChange={(event) => setSettings({ ...settings, searchCategories: textToList(event.target.value) })}
                  rows={14}
                  className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm leading-relaxed text-white outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  maxPerRun: 100,
                  searchLocations: DEFAULT_LEAD_SEARCH_LOCATIONS,
                  searchCategories: DEFAULT_LEAD_SEARCH_CATEGORIES,
                })}
                className="min-h-10 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55 transition-colors hover:border-white/20 hover:text-white"
              >
                Reset Defaults
              </button>
              <div className="grid grid-cols-1 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setCriteriaOpen(false)}
                  className="min-h-10 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await saveSettings();
                    setCriteriaOpen(false);
                  }}
                  disabled={busyAction === "settings"}
                  className="min-h-10 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
                >
                  {busyAction === "settings" ? "Saving..." : "Save Criteria"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr] xl:gap-6">
        <div className="order-1 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4 xl:col-start-1">
            <div className="mb-3 grid gap-2 sm:flex sm:items-center">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search leads"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-400/50"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as LeadCandidateStatus | "all")}
                className="min-h-11 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none [color-scheme:dark] sm:w-36"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-scroll max-h-[min(56vh,560px)] space-y-2 overflow-y-auto pr-1 xl:max-h-[680px]">
              {filteredLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
                  No leads match this view.
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead._id}
                    type="button"
                    onClick={() => setSelectedId(lead._id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selected?._id === lead._id
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/8 bg-[#0d0d0d] hover:border-white/18"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-snug text-white">{lead.businessName}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/40">{lead.city} · {lead.niche}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/35">
                      <span>{lead.fitScore}/100 fit</span>
                      <span className="ml-auto">{lead.email ? "Email found" : "Contact form"}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
        </div>

        <div className="order-3 rounded-2xl border border-white/8 bg-white/3 p-4 xl:col-start-1 xl:row-start-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Schedule</h2>
                <p className="mt-0.5 text-xs text-white/35">Cron checks every minute and runs only at this saved time.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
                  className="h-4 w-4 accent-sky-400"
                />
                Enabled
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/45">Frequency</label>
                <select
                  value={settings.frequency}
                  onChange={(event) => setSettings({ ...settings, frequency: event.target.value as LeadGeneratorSettings["frequency"] })}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/45">Time</label>
                <input
                  type="time"
                  value={settings.time}
                  onChange={(event) => setSettings({ ...settings, time: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
                />
              </div>
              {settings.frequency === "weekly" && (
                <div>
                  <label className="mb-1 block text-xs text-white/45">Weekday</label>
                  <select
                    value={settings.dayOfWeek}
                    onChange={(event) => setSettings({ ...settings, dayOfWeek: Number(event.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {settings.frequency === "monthly" && (
                <div>
                  <label className="mb-1 block text-xs text-white/45">Day of month</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={settings.dayOfMonth}
                    onChange={(event) => setSettings({ ...settings, dayOfMonth: Number(event.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-white/45">Max per run</label>
                <input
                  type="number"
                  min={20}
                  max={250}
                  value={settings.maxPerRun}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSettings({ ...settings, maxPerRun: Math.min(Math.max(20, value), 250) });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-white/45">Timezone</label>
                <input
                  value={settings.timezone}
                  onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-white/30">
                {settings.lastRunAt
                  ? `Last run: ${new Date(settings.lastRunAt).toLocaleString()}`
                  : "No scheduled run yet."}
              </p>
              <button
                type="button"
                onClick={saveSettings}
                disabled={busyAction === "settings"}
                className="min-h-10 rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/14 disabled:opacity-40"
              >
                {busyAction === "settings" ? "Saving..." : "Save"}
              </button>
            </div>
            {settings.lastRunMessage && (
              <p className="mt-3 text-xs text-white/35">{settings.lastRunMessage}</p>
            )}
        </div>

        <div className="order-2 min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          {!selected ? (
            <div className="flex min-h-[480px] items-center justify-center text-sm text-white/35">
              Select a lead to review.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(selected.status)}`}>
                      {selected.status}
                    </span>
                    <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-white/45">
                      {selected.fitScore}/100 fit
                    </span>
                  </div>
                  <input
                    value={selected.businessName}
                    onChange={(event) => updateSelected({ businessName: event.target.value })}
                    className="w-full border-0 bg-transparent p-0 text-xl font-semibold leading-tight text-white outline-none sm:text-2xl"
                  />
                  <p className="mt-1 text-sm text-white/40">{selected.city} · {selected.region}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  {selected.approvedPipelineContactId && (
                    <Link
                      href={`/admin/pipeline/contacts/${selected.approvedPipelineContactId}`}
                      className="min-h-10 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-center text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-300/40"
                    >
                      View Pipeline Contact
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={saveSelected}
                    disabled={saving}
                    className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save Review"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Niche</span>
                  <input
                    value={selected.niche}
                    onChange={(event) => updateSelected({ niche: event.target.value })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Status</span>
                  <select
                    value={selected.status}
                    onChange={(event) => updateSelected({ status: event.target.value as LeadCandidateStatus })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
                  >
                    {STATUS_OPTIONS.filter((status) => status.id !== "all").map((status) => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Phone</span>
                  <input
                    value={selected.phone ?? ""}
                    onChange={(event) => updateSelected({ phone: event.target.value || null })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Email</span>
                  <input
                    value={selected.email ?? ""}
                    onChange={(event) => updateSelected({ email: event.target.value || null })}
                    placeholder="Public email only"
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-400/50"
                  />
                  {(selected.emails ?? []).filter((e) => e !== selected.email).length > 0 && (
                    <span className="mt-1 block text-[11px] text-white/35">
                      Also found: {(selected.emails ?? []).filter((e) => e !== selected.email).join(", ")}
                    </span>
                  )}
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1 block text-xs text-white/45">Address</span>
                  <input
                    value={selected.address ?? ""}
                    onChange={(event) => updateSelected({ address: event.target.value || null })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Website</span>
                  <input
                    value={selected.website ?? ""}
                    onChange={(event) => updateSelected({ website: event.target.value || null })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Contact URL</span>
                  <input
                    value={selected.contactUrl ?? ""}
                    onChange={(event) => updateSelected({ contactUrl: event.target.value || null })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-white">
                    Open website
                  </a>
                )}
                {selected.contactUrl && (
                  <a href={selected.contactUrl} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-white">
                    Open contact page
                  </a>
                )}
                <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
                  Source
                </a>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Current snapshot</span>
                  <textarea
                    value={selected.currentSnapshot}
                    onChange={(event) => updateSelected({ currentSnapshot: event.target.value })}
                    rows={5}
                    className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Gap assessment</span>
                  <textarea
                    value={selected.gapAssessment}
                    onChange={(event) => updateSelected({ gapAssessment: event.target.value })}
                    rows={5}
                    className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">How CEL3 can help</span>
                  <textarea
                    value={selected.howCel3CanHelp}
                    onChange={(event) => updateSelected({ howCel3CanHelp: event.target.value })}
                    rows={5}
                    className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-sky-400/15 bg-sky-400/8 p-4">
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Outreach Email</h2>
                    <p className="mt-0.5 text-xs text-white/40">
                      {selected.email
                        ? (() => {
                            const cc = (selected.emails ?? [])
                              .filter((e) => e && e !== selected.email)
                              .slice(0, 3);
                            return `Ready to send to ${selected.email}${cc.length ? ` (CC: ${cc.join(", ")})` : ""}`;
                          })()
                        : "No public email saved. Use the contact page or add a verified email."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={sendSelectedEmail}
                    disabled={!selected.email || busyAction === "send"}
                    className="min-h-10 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
                  >
                    {busyAction === "send" ? "Sending..." : "Send Email Now"}
                  </button>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Subject</span>
                  <input
                    value={selected.emailSubject}
                    onChange={(event) => updateSelected({ emailSubject: event.target.value })}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs text-white/45">Message HTML</span>
                  <textarea
                    value={selected.emailBodyHtml}
                    onChange={(event) => updateSelected({ emailBodyHtml: event.target.value })}
                    rows={8}
                    className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  />
                </label>
                <div className="admin-scroll mt-3 max-h-52 overflow-y-auto rounded-xl border border-white/8 bg-black p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/35">Plain preview</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">{stripHtml(selected.emailBodyHtml)}</p>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-white/45">Internal notes</span>
                <textarea
                  value={selected.notes ?? ""}
                  onChange={(event) => updateSelected({ notes: event.target.value || null })}
                  rows={3}
                  className="admin-scroll w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={rejectSelected}
                  className="min-h-10 rounded-xl border border-white/8 px-4 py-2 text-sm text-white/35 transition-colors hover:border-red-300/20 hover:text-red-300 sm:border-0 sm:px-0"
                >
                  Reject Lead
                </button>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => patchSelected({ status: "contacted" }, "Lead marked contacted.")}
                    className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Mark Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => patchSelected({ status: "followed-up" }, "Lead marked followed up.")}
                    className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Mark Followed Up
                  </button>
                  <button
                    type="button"
                    onClick={approveSelected}
                    disabled={busyAction === "approve"}
                    className="min-h-10 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {busyAction === "approve" ? "Approving..." : "Approve to Pipeline"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
