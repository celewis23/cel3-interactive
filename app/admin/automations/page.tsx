"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutomationRun {
  _id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  isDryRun?: boolean;
}

interface Automation {
  _id: string;
  name: string;
  triggerType: string;
  isEnabled: boolean;
  nodeCount: number;
  conditionCount: number;
  recentRuns: AutomationRun[];
  _createdAt: string;
  _updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RUN_DOT_COLORS: Record<string, string> = {
  completed: "bg-emerald-400",
  failed:    "bg-red-400",
  running:   "bg-sky-400 animate-pulse",
  cancelled: "bg-white/20",
};

const TRIGGER_LABELS: Record<string, string> = {
  contract_signed:       "Contract signed",
  contract_declined:     "Contract declined",
  contract_expired:      "Contract expired",
  invoice_paid_full:     "Invoice paid (full)",
  invoice_sent:          "Invoice sent",
  invoice_overdue:       "Invoice overdue",
  lead_created:          "Lead created",
  lead_stage_changed:    "Lead stage changed",
  lead_won:              "Lead won",
  lead_lost:             "Lead lost",
  client_created:        "Client created",
  task_assigned:         "Task assigned",
  task_completed:        "Task completed",
  task_due_soon:         "Task due soon",
  project_status_changed:"Project status changed",
  booking_confirmed:     "Booking confirmed",
  booking_cancelled:     "Booking cancelled",
  form_completed:        "Form completed",
  manual:                "Manual trigger",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/automations");
      const data = await res.json();
      setAutomations(data.automations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = automations.filter((a) => {
    if (filter === "enabled")  return a.isEnabled;
    if (filter === "disabled") return !a.isEnabled;
    return true;
  });

  const toggle = async (a: Automation) => {
    setTogglingId(a._id);
    try {
      await fetch(`/api/admin/automations/${a._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !a.isEnabled }),
      });
      setAutomations((prev) => prev.map((x) => x._id === a._id ? { ...x, isEnabled: !a.isEnabled } : x));
    } finally {
      setTogglingId(null);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Delete this automation? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/automations/${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const createNew = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled automation", triggerType: "manual", nodes: { nodes: [] } }),
      });
      const data = await res.json();
      if (res.ok && data._id) router.push(`/admin/automations/${data._id}/builder`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Automations</h1>
          <p className="text-sm text-white/40 mt-0.5">Build and manage your workflow automations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/automations/templates")}
            className="px-3.5 py-2 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/8 transition-colors"
          >
            Browse templates
          </button>
          <button
            onClick={createNew}
            disabled={creating}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-sm font-semibold transition-colors"
          >
            {creating ? "Creating…" : "+ New automation"}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-white/3 rounded-xl p-1 w-fit">
        {(["all", "enabled", "disabled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-white/20 text-4xl mb-3">⚡</div>
          <div className="text-white/40 text-sm mb-4">
            {filter === "all" ? "No automations yet." : `No ${filter} automations.`}
          </div>
          {filter === "all" && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/admin/automations/templates")}
                className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/8 transition-colors"
              >
                Start from a template
              </button>
              <button
                onClick={createNew}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors"
              >
                Build from scratch
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const runs = a.recentRuns ?? [];
            const lastRun = runs[0];
            const isBusy = togglingId === a._id || deletingId === a._id;

            return (
              <div
                key={a._id}
                className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-white/12 transition-colors"
              >
                {/* Enable toggle */}
                <button
                  onClick={() => toggle(a)}
                  disabled={isBusy}
                  title={a.isEnabled ? "Disable" : "Enable"}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    a.isEnabled ? "bg-sky-500" : "bg-white/10"
                  } ${isBusy ? "opacity-40" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      a.isEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{a.name}</span>
                    {!a.isEnabled && (
                      <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">paused</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-white/35">
                      ⚡ {TRIGGER_LABELS[a.triggerType] ?? a.triggerType}
                    </span>
                    <span className="text-xs text-white/25">
                      {a.nodeCount} step{a.nodeCount !== 1 ? "s" : ""}
                    </span>
                    {a.conditionCount > 0 && (
                      <span className="text-xs text-white/25">
                        {a.conditionCount} condition{a.conditionCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Run history dots */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {runs.slice(0, 8).map((run) => (
                    <span
                      key={run._id}
                      title={`${run.status}${run.isDryRun ? " (dry run)" : ""} — ${new Date(run.startedAt).toLocaleDateString()}`}
                      className={`w-2 h-2 rounded-full ${RUN_DOT_COLORS[run.status] ?? "bg-white/15"}`}
                    />
                  ))}
                  {runs.length === 0 && <span className="text-[11px] text-white/20">No runs yet</span>}
                </div>

                {/* Last run time */}
                {lastRun && (
                  <div className="flex-shrink-0 text-[11px] text-white/25">
                    {new Date(lastRun.startedAt).toLocaleDateString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/admin/automations/${a._id}/builder`)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                    title="Open builder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteAutomation(a._id)}
                    disabled={isBusy}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
