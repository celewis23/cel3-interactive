"use client";

import { useState } from "react";
import Link from "next/link";

interface Step {
  _key: string;
  title: string;
  status: string;
  dueDate: string | null;
}

interface Instance {
  _id: string;
  templateName: string | null;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  startDate: string;
  status: string;
  steps: Step[];
  _createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-sky-500/10 text-sky-400",
  completed: "bg-green-500/10 text-green-400",
  archived: "bg-gray-500/10 text-gray-400",
};

interface Props {
  instances: Instance[];
}

function getProgress(steps: Step[]) {
  if (!steps?.length) return { done: 0, total: 0, pct: 0 };
  const done = steps.filter((s) => ["complete", "skipped"].includes(s.status)).length;
  const total = steps.length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

function getOverdue(steps: Step[]) {
  const today = new Date().toISOString().slice(0, 10);
  return steps.filter(
    (s) => s.dueDate && s.dueDate < today && s.status === "pending"
  ).length;
}

export default function ChecklistList({ instances: initial }: Props) {
  const [instances, setInstances] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");

  const filtered = instances.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        i.clientName.toLowerCase().includes(q) ||
        i.clientEmail?.toLowerCase().includes(q) ||
        i.clientCompany?.toLowerCase().includes(q) ||
        i.templateName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    active: instances.filter((i) => i.status === "active").length,
    completed: instances.filter((i) => i.status === "completed").length,
    stalled: instances.filter((i) => {
      if (i.status !== "active") return false;
      return getOverdue(i.steps ?? []) > 0;
    }).length,
  };

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete onboarding for ${name}? This cannot be undone.`)) return;
    await fetch(`/api/admin/onboarding/${id}`, { method: "DELETE" });
    setInstances((prev) => prev.filter((i) => i._id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active", value: stats.active },
          { label: "Completed", value: stats.completed },
          { label: "Overdue Steps", value: instances.filter(i => i.status === "active").reduce((n, i) => n + getOverdue(i.steps ?? []), 0) },
          { label: "Stalled", value: stats.stalled },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, company, template…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-400/50"
        />
        <div className="flex gap-2">
          {["active", "completed", "archived"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  : "bg-white/5 text-white/40 hover:text-white border border-transparent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No onboarding records found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((instance) => {
            const { done, total, pct } = getProgress(instance.steps ?? []);
            const overdue = getOverdue(instance.steps ?? []);
            return (
              <div
                key={instance._id}
                className={`bg-white/3 border rounded-xl px-5 py-4 hover:bg-white/5 transition-colors ${
                  overdue > 0 && instance.status === "active"
                    ? "border-orange-500/30"
                    : "border-white/8"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/admin/onboarding/${instance._id}`}
                        className="font-semibold text-white hover:text-sky-400 transition-colors"
                      >
                        {instance.clientName}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[instance.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                        {instance.status}
                      </span>
                      {overdue > 0 && instance.status === "active" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {overdue} overdue
                        </span>
                      )}
                    </div>

                    {instance.clientCompany && (
                      <div className="text-xs text-white/40">{instance.clientCompany}</div>
                    )}
                    {instance.templateName && (
                      <div className="text-xs text-white/30 mt-0.5">{instance.templateName}</div>
                    )}

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/30">
                            {done} / {total} steps
                          </span>
                          <span className="text-xs text-white/30">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100
                                ? "bg-green-400"
                                : overdue > 0
                                ? "bg-orange-400"
                                : "bg-sky-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-white/25 mt-2">
                      Started {instance.startDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/onboarding/${instance._id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => handleDelete(instance._id, instance.clientName)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
