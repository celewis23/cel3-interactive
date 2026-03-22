"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TimeEntryForm from "./TimeEntryForm";

interface TimeEntry {
  _id: string;
  date: string;
  startTime: string | undefined;
  endTime: string | undefined;
  durationSeconds: number;
  description: string | null;
  projectId: string | null;
  projectName: string | null;
  taskTitle: string | null;
  clientName: string | null;
  billable: boolean;
  hourlyRate: number;
  invoiceId: string | null;
  billedAt: string | null;
}

type GroupBy = "day" | "project" | "client";
type Period = "week" | "month" | "all";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function getEarnings(entry: TimeEntry): number {
  return (entry.durationSeconds / 3600) * entry.hourlyRate;
}

function periodStart(period: Period): string {
  if (period === "all") return "";
  const d = new Date();
  if (period === "week") {
    d.setDate(d.getDate() - d.getDay());
  } else {
    d.setDate(1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function TimeLog() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [period, setPeriod] = useState<Period>("week");
  const [filterClient, setFilterClient] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterBillable, setFilterBillable] = useState<"" | "true" | "false">("");
  const [filterBilled, setFilterBilled] = useState<"" | "true" | "false">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState("");
  const [invoiceStripeId, setInvoiceStripeId] = useState("");
  const [invoiceResult, setInvoiceResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const from = periodStart(period);
    if (from) params.set("from", from);
    if (filterClient) params.set("clientName", filterClient);
    if (filterProject) params.set("projectId", filterProject);
    if (filterBillable) params.set("billable", filterBillable);
    if (filterBilled) params.set("billed", filterBilled);

    const res = await fetch(`/api/admin/time/entries?${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [period, filterClient, filterProject, filterBillable, filterBilled]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this time entry?")) return;
    await fetch(`/api/admin/time/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  async function handleInvoice() {
    if (!invoiceStripeId) return;
    setInvoicing(true);
    try {
      const res = await fetch("/api/admin/time/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeCustomerId: invoiceStripeId, clientName: invoiceClient }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvoiceResult(`Invoice created: ${data.invoice?.number ?? data.invoice?.id} — ${data.billedCount} entries billed`);
        load();
      } else {
        setInvoiceResult(`Error: ${data.error}`);
      }
    } finally {
      setInvoicing(false);
    }
  }

  // Totals
  const totalSeconds = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const billableSeconds = entries.filter((e) => e.billable).reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const billableAmount = entries.filter((e) => e.billable).reduce((s, e) => s + getEarnings(e), 0);
  const unbilledAmount = entries.filter((e) => e.billable && !e.invoiceId).reduce((s, e) => s + getEarnings(e), 0);

  // Group entries
  function groupEntries() {
    const groups: Record<string, TimeEntry[]> = {};
    for (const e of entries) {
      let key: string;
      if (groupBy === "day") key = e.date;
      else if (groupBy === "project") key = e.projectName || "No project";
      else key = e.clientName || "No client";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }

  const grouped = groupEntries();

  // Unique clients (for invoice form)
  const uniqueClients = [...new Set(entries.filter((e) => e.clientName).map((e) => e.clientName!))];

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Hours", value: formatDuration(totalSeconds) },
          { label: "Billable Hours", value: formatDuration(billableSeconds) },
          { label: "Billable Amount", value: formatMoney(billableAmount) },
          { label: "Unbilled", value: formatMoney(unbilledAmount), highlight: unbilledAmount > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className={`text-lg font-bold ${highlight ? "text-yellow-400" : "text-white"}`}>{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Period */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(["week", "month", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm capitalize transition-colors ${
                period === p ? "bg-sky-500/10 text-sky-400" : "bg-white/3 text-white/40 hover:text-white"
              }`}
            >
              {p === "all" ? "All time" : `This ${p}`}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(["day", "project", "client"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-2 text-sm capitalize transition-colors ${
                groupBy === g ? "bg-sky-500/10 text-sky-400" : "bg-white/3 text-white/40 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Billable filter */}
        <select
          value={filterBillable}
          onChange={(e) => setFilterBillable(e.target.value as "" | "true" | "false")}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none appearance-none"
        >
          <option value="" className="bg-[#0f0f0f]">All entries</option>
          <option value="true" className="bg-[#0f0f0f]">Billable only</option>
          <option value="false" className="bg-[#0f0f0f]">Non-billable only</option>
        </select>

        <select
          value={filterBilled}
          onChange={(e) => setFilterBilled(e.target.value as "" | "true" | "false")}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none appearance-none"
        >
          <option value="" className="bg-[#0f0f0f]">All billing status</option>
          <option value="false" className="bg-[#0f0f0f]">Unbilled only</option>
          <option value="true" className="bg-[#0f0f0f]">Billed only</option>
        </select>

        <div className="flex-1" />

        {/* Invoice button */}
        <button
          onClick={() => { setShowInvoice(!showInvoice); setInvoiceResult(null); }}
          className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm border border-green-500/20 transition-colors"
        >
          Invoice from Time
        </button>
      </div>

      {/* Invoice panel */}
      {showInvoice && (
        <div className="bg-white/3 border border-green-500/20 rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Generate Invoice from Unbilled Time</div>
          {invoiceResult ? (
            <div className={`text-sm px-4 py-3 rounded-lg ${invoiceResult.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
              {invoiceResult}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Client</label>
                  <input
                    type="text"
                    list="invoice-clients"
                    value={invoiceClient}
                    onChange={(e) => setInvoiceClient(e.target.value)}
                    placeholder="Client name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
                  />
                  <datalist id="invoice-clients">
                    {uniqueClients.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Stripe Customer ID *</label>
                  <input
                    type="text"
                    value={invoiceStripeId}
                    onChange={(e) => setInvoiceStripeId(e.target.value)}
                    placeholder="cus_xxxxx"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50 font-mono"
                  />
                </div>
              </div>
              <div className="text-xs text-white/30">
                All unbilled, billable time entries for this client will be added as line items.
              </div>
              <button
                onClick={handleInvoice}
                disabled={invoicing || !invoiceStripeId}
                className="px-5 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-sm disabled:opacity-40 transition-colors"
              >
                {invoicing ? "Creating invoice…" : "Create Invoice"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Log */}
      {loading ? (
        <div className="py-12 text-center text-white/30 text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center text-white/30 text-sm">
          No time entries.{" "}
          <Link href="/admin/time/new" className="text-sky-400 hover:text-sky-300">Add one.</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([groupKey, groupEntries]) => {
            const groupSeconds = groupEntries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
            const groupAmount = groupEntries.filter((e) => e.billable).reduce((s, e) => s + getEarnings(e), 0);
            return (
              <div key={groupKey}>
                {/* Group header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {groupBy === "day"
                      ? new Date(groupKey + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "long", month: "long", day: "numeric",
                        })
                      : groupKey}
                  </div>
                  <div className="text-xs text-white/30">
                    {formatDuration(groupSeconds)}
                    {groupAmount > 0 && ` · ${formatMoney(groupAmount)}`}
                  </div>
                </div>

                <div className="space-y-1">
                  {groupEntries.map((entry) => {
                    const earnings = getEarnings(entry);
                    const isEditing = editingId === entry._id;
                    return (
                      <div key={entry._id} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                        {isEditing ? (
                          <div className="p-4">
                            <TimeEntryForm
                              initial={entry}
                              onSaved={(updated) => {
                                setEntries((prev) => prev.map((e) => e._id === updated._id ? updated as TimeEntry : e));
                                setEditingId(null);
                              }}
                              onCancel={() => setEditingId(null)}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                            {/* Billable indicator */}
                            <div
                              className={`w-1 h-8 rounded-full flex-shrink-0 ${
                                entry.billable ? "bg-sky-400/60" : "bg-white/10"
                              }`}
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-white">
                                  {entry.description || (
                                    <span className="text-white/30 italic">No description</span>
                                  )}
                                </span>
                                {entry.invoiceId && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                                    Billed
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {entry.projectName && (
                                  <span className="text-xs text-white/40">{entry.projectName}</span>
                                )}
                                {entry.clientName && (
                                  <span className="text-xs text-white/30">{entry.clientName}</span>
                                )}
                                {entry.taskTitle && (
                                  <span className="text-xs text-white/25">↳ {entry.taskTitle}</span>
                                )}
                              </div>
                            </div>

                            {/* Duration + amount */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-white">
                                {formatDuration(entry.durationSeconds)}
                              </div>
                              {entry.billable && earnings > 0 && (
                                <div className="text-xs text-white/40">{formatMoney(earnings)}</div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingId(entry._id)}
                                className="p-1.5 rounded text-white/30 hover:text-white transition-colors"
                                title="Edit"
                              >
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(entry._id)}
                                className="p-1.5 rounded text-red-400/30 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
