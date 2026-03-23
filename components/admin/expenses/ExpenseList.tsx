"use client";

import { useState, useEffect, useCallback } from "react";
import ExpenseForm, { type Expense, type ExpenseCategory } from "./ExpenseForm";

interface Props {
  categories: ExpenseCategory[];
}

function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const METHOD_LABELS: Record<string, string> = {
  card: "Card", cash: "Cash", bank_transfer: "Transfer", check: "Check", other: "Other",
};

export default function ExpenseList({ categories }: Props) {
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalCents, setTotalCents] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<Expense | null | "new">(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [catFilter,  setCatFilter]  = useState("");
  const [taxFilter,  setTaxFilter]  = useState("");
  const [offset,     setOffset]     = useState(0);
  const LIMIT = 50;

  const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (from)       p.set("from", from);
      if (to)         p.set("to", to);
      if (catFilter)  p.set("categoryId", catFilter);
      if (taxFilter)  p.set("taxDeductible", taxFilter);

      const res = await fetch(`/api/admin/expenses?${p}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExpenses(data.expenses);
      setTotal(data.total);
      setTotalCents(data.totalCents);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [from, to, catFilter, taxFilter, offset]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(saved: Expense) {
    setExpenses((prev) => {
      const idx = prev.findIndex((e) => e._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setEditing(null);
    load();
  }

  return (
    <>
      {editing && (
        <ExpenseForm
          expense={editing === "new" ? null : editing}
          categories={categories}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-sky-500/50"
            placeholder="From" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-sky-500/50"
            placeholder="To" />
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setOffset(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-sky-500/50">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={taxFilter} onChange={(e) => { setTaxFilter(e.target.value); setOffset(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-sky-500/50">
            <option value="">All expenses</option>
            <option value="true">Tax deductible only</option>
          </select>
          {(from || to || catFilter || taxFilter) && (
            <button onClick={() => { setFrom(""); setTo(""); setCatFilter(""); setTaxFilter(""); setOffset(0); }}
              className="text-xs text-white/40 hover:text-white transition-colors">Clear</button>
          )}
          <div className="flex-1" />
          <button onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">
            + Add Expense
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/3 border border-white/8 rounded-xl">
          <span className="text-xs text-white/40">{total} expense{total !== 1 ? "s" : ""}</span>
          <span className="text-sm font-semibold text-white">{fmtMoney(totalCents)}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 text-center text-white/25 text-sm">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-white/25 text-sm">No expenses found</div>
        ) : (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/5">
              {expenses.map((exp) => {
                const cat = catMap[exp.categoryId ?? ""];
                return (
                  <li key={exp._id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/2 group">
                    {/* Category dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat?.color ?? "#6b7280" }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white truncate">{exp.vendor}</span>
                        {exp.taxDeductible && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">Tax</span>
                        )}
                        {exp.receipts && exp.receipts.length > 0 && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-white/8 text-white/30 flex-shrink-0">
                            {exp.receipts.length} receipt{exp.receipts.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{fmtDate(exp.date)}</span>
                        {cat && <span className="text-xs text-white/25">{cat.name}</span>}
                        {exp.description && <span className="text-xs text-white/20 truncate">{exp.description}</span>}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-white">{fmtMoney(exp.amountCents, exp.currency)}</div>
                      <div className="text-[10px] text-white/25">{METHOD_LABELS[exp.paymentMethod] ?? exp.paymentMethod}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setEditing(exp)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(exp._id)} disabled={deleting === exp._id}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white disabled:opacity-30 border border-white/10 transition-colors"
            >← Prev</button>
            <span className="text-xs text-white/30">{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white disabled:opacity-30 border border-white/10 transition-colors"
            >Next →</button>
          </div>
        )}
      </div>
    </>
  );
}
