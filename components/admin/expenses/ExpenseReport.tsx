"use client";

import { useState, useEffect } from "react";
import type { ExpenseCategory } from "./ExpenseForm";

interface ReportData {
  monthTotalCents: number;
  quarterTotalCents: number;
  yearTotalCents: number;
  period: { year: number; month: number; quarter: number };
  categoryBreakdown: { categoryId: string; totalCents: number; count: number }[];
}

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

interface Props {
  categories: ExpenseCategory[];
}

export default function ExpenseReport({ categories }: Props) {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  useEffect(() => {
    fetch("/api/admin/expenses/report")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-white/25 text-sm">Loading report…</div>;
  if (!data)   return <div className="py-12 text-center text-white/25 text-sm">Could not load report</div>;

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const qLabel = `Q${data.period.quarter} ${data.period.year}`;
  const mLabel = `${MONTH_NAMES[data.period.month - 1]} ${data.period.year}`;

  const topCats = [...data.categoryBreakdown]
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10);
  const maxCatCents = topCats[0]?.totalCents ?? 1;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: mLabel,            value: data.monthTotalCents,   sub: "This month"   },
          { label: qLabel,            value: data.quarterTotalCents, sub: "This quarter" },
          { label: String(data.period.year), value: data.yearTotalCents,    sub: "This year"    },
        ].map((card) => (
          <div key={card.label} className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="text-xs text-white/30 mb-1">{card.sub}</div>
            <div className="text-xl font-semibold text-white">{fmtMoney(card.value)}</div>
            <div className="text-xs text-white/20 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {topCats.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Spending by Category (YTD)</h3>
          </div>
          <div className="p-5 space-y-3">
            {topCats.map((row) => {
              const cat = catMap[row.categoryId];
              const pct = Math.round((row.totalCents / maxCatCents) * 100);
              return (
                <div key={row.categoryId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat?.color ?? "#6b7280" }} />
                      <span className="text-sm text-white/70">{cat?.name ?? "Uncategorized"}</span>
                      <span className="text-xs text-white/25">{row.count} expense{row.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{fmtMoney(row.totalCents)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cat?.color ?? "#6b7280", opacity: 0.7 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topCats.length === 0 && (
        <div className="py-8 text-center text-white/25 text-sm">No expenses recorded this year yet</div>
      )}
    </div>
  );
}
