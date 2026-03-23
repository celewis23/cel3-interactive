"use client";

import { useState, useEffect } from "react";
import type { ExpenseCategory } from "./ExpenseForm";

interface Recurring {
  _id: string;
  name: string;
  amountCents: number;
  currency: string;
  vendor: string;
  categoryId?: string | null;
  description?: string | null;
  paymentMethod: string;
  taxDeductible: boolean;
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  nextDueDate: string;
  active: boolean;
}

interface Props {
  categories: ExpenseCategory[];
  onProcessed?: () => void;
}

function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annually: "Annually",
};

const PAYMENT_METHODS = [
  { value: "card",          label: "Credit/Debit Card" },
  { value: "cash",          label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check",         label: "Check" },
  { value: "other",         label: "Other" },
];

function emptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return { name: "", amountStr: "", currency: "USD", vendor: "", categoryId: "", description: "",
    paymentMethod: "card", taxDeductible: false, frequency: "monthly" as const, nextDueDate: today };
}

export default function RecurringList({ categories, onProcessed }: Props) {
  const [list,       setList]       = useState<Recurring[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState(emptyForm());

  const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/expenses/recurring");
      if (r.ok) setList(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleProcess() {
    if (!confirm("Generate all overdue recurring expenses now?")) return;
    setProcessing(true);
    try {
      const r = await fetch("/api/admin/expenses/recurring/process", { method: "POST" });
      if (!r.ok) throw new Error();
      const { generated } = await r.json();
      alert(`Generated ${generated} expense${generated !== 1 ? "s" : ""}.`);
      await load();
      onProcessed?.();
    } catch {
      alert("Failed to process recurring expenses.");
    } finally { setProcessing(false); }
  }

  async function handleToggle(rec: Recurring) {
    try {
      const r = await fetch(`/api/admin/expenses/recurring/${rec._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rec.active }),
      });
      if (r.ok) setList((prev) => prev.map((x) => x._id === rec._id ? { ...x, active: !rec.active } : x));
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recurring expense?")) return;
    await fetch(`/api/admin/expenses/recurring/${id}`, { method: "DELETE" });
    setList((prev) => prev.filter((x) => x._id !== id));
  }

  async function handleCreate() {
    const amountCents = Math.round(parseFloat(form.amountStr) * 100);
    if (!form.name.trim() || !form.vendor.trim() || isNaN(amountCents) || amountCents <= 0) return;

    setSaving(true);
    try {
      const r = await fetch("/api/admin/expenses/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amountCents, vendor: form.vendor.trim(), name: form.name.trim(),
          categoryId: form.categoryId || null, description: form.description.trim() || null }),
      });
      if (!r.ok) throw new Error();
      const created = await r.json();
      setList((prev) => [...prev, created]);
      setShowForm(false);
      setForm(emptyForm());
    } catch {
      alert("Failed to create recurring expense.");
    } finally { setSaving(false); }
  }

  const dueCount = list.filter((r) => r.active && r.nextDueDate <= new Date().toISOString().slice(0, 10)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {dueCount > 0 && (
          <button onClick={handleProcess} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40">
            {processing ? "Processing…" : `Process ${dueCount} due`}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">
          + Add Recurring
        </button>
      </div>

      {/* New recurring form */}
      {showForm && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Recurring Expense</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Name / Label</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monthly hosting"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Vendor</label>
              <input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                placeholder="e.g. AWS"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Amount</label>
              <input type="number" step="0.01" min="0" value={form.amountStr} onChange={(e) => setForm((f) => ({ ...f, amountStr: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as typeof form.frequency }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">First due</label>
              <input type="date" value={form.nextDueDate} onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                <option value="">— Category —</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Payment</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setForm(emptyForm()); }}
              className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black text-sm font-semibold transition-colors">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-white/25 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="py-8 text-center text-white/25 text-sm">No recurring expenses set up yet</div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <ul className="divide-y divide-white/5">
            {list.map((rec) => {
              const cat = catMap[rec.categoryId ?? ""];
              const isOverdue = rec.active && rec.nextDueDate <= new Date().toISOString().slice(0, 10);
              return (
                <li key={rec._id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat?.color ?? "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{rec.name || rec.vendor}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/8 text-white/40">{FREQ_LABELS[rec.frequency]}</span>
                      {isOverdue && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Due</span>}
                    </div>
                    <div className="text-xs text-white/30 mt-0.5">
                      {rec.vendor}{cat ? ` · ${cat.name}` : ""} · Next: {rec.nextDueDate}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white flex-shrink-0">{fmtMoney(rec.amountCents, rec.currency)}</span>
                  <button onClick={() => handleToggle(rec)}
                    className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 ${rec.active ? "bg-sky-500" : "bg-white/15"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${rec.active ? "translate-x-1.5" : "-translate-x-1.5"}`} />
                  </button>
                  <button onClick={() => handleDelete(rec._id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
