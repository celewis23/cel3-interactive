"use client";

import { useState, useEffect } from "react";
import ExpenseList from "@/components/admin/expenses/ExpenseList";
import ExpenseReport from "@/components/admin/expenses/ExpenseReport";
import RecurringList from "@/components/admin/expenses/RecurringList";
import CategoryManager from "@/components/admin/expenses/CategoryManager";
import type { ExpenseCategory } from "@/components/admin/expenses/ExpenseForm";

type Tab = "expenses" | "report" | "recurring" | "categories";

export default function ExpensesPage() {
  const [tab,        setTab]        = useState<Tab>("expenses");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    fetch("/api/admin/expenses/categories")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setCategories(d))
      .finally(() => setLoadingCats(false));
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "expenses",   label: "Expenses"   },
    { id: "report",     label: "Report"     },
    { id: "recurring",  label: "Recurring"  },
    { id: "categories", label: "Categories" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Expenses</h1>
        <p className="text-sm text-white/30 mt-1">Track spending, receipts, and recurring costs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingCats ? (
        <div className="py-12 text-center text-white/25 text-sm">Loading…</div>
      ) : (
        <>
          {tab === "expenses"   && <ExpenseList categories={categories} />}
          {tab === "report"     && <ExpenseReport categories={categories} />}
          {tab === "recurring"  && <RecurringList categories={categories} />}
          {tab === "categories" && <CategoryManager categories={categories} onChange={setCategories} />}
        </>
      )}
    </div>
  );
}
