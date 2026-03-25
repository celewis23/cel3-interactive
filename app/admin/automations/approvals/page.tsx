"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalItem {
  _id: string;
  runId: string;
  nodeId: string;
  automationId: string;
  nodeLabel?: string;
  automationName?: string;
  entityType?: string;
  entityId?: string;
  outputData?: Record<string, unknown>;
  createdAt: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/automations/approvals");
      const data = await res.json();
      setApprovals(data.approvals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (item: ApprovalItem, decision: "approve" | "reject") => {
    setActing(item._id);
    try {
      const res = await fetch("/api/admin/automations/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: item.runId,
          nodeId: item.nodeId,
          automationId: item.automationId,
          decision,
        }),
      });
      if (res.ok) {
        setApprovals((prev) => prev.filter((a) => a._id !== item._id));
        setSuccessMsg(`Step ${decision === "approve" ? "approved" : "rejected"} successfully.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/automations")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Automations
          </button>
          <h1 className="text-xl font-bold text-white">Approvals Inbox</h1>
          <p className="text-sm text-white/40 mt-1">Review automation steps that require manual approval before executing.</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Success flash */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 mb-4">
          {successMsg}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading…</div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-white/40 text-sm">Nothing pending approval — you're all caught up.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-white/30 mb-1">{approvals.length} pending approval{approvals.length !== 1 ? "s" : ""}</div>
          {approvals.map((item) => {
            const isBusy = acting === item._id;
            return (
              <div
                key={item._id}
                className="bg-white/3 border border-amber-500/20 rounded-2xl px-5 py-4 space-y-3"
              >
                {/* Meta row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">{item.nodeLabel ?? "Approval required"}</span>
                    </div>
                    {item.automationName && (
                      <div className="text-xs text-white/35">
                        Automation: <span className="text-white/55">{item.automationName}</span>
                      </div>
                    )}
                    {item.entityType && item.entityId && (
                      <div className="text-xs text-white/30 mt-0.5">
                        Entity: {item.entityType} — <span className="font-mono text-white/40">{item.entityId}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-white/25 flex-shrink-0">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Output data preview */}
                {item.outputData && Object.keys(item.outputData).length > 0 && (
                  <div className="bg-white/3 rounded-xl px-3 py-2.5 font-mono text-[11px] text-white/40 overflow-x-auto">
                    {JSON.stringify(item.outputData, null, 2)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => act(item, "reject")}
                    disabled={isBusy}
                    className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => act(item, "approve")}
                    disabled={isBusy}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    {isBusy ? "Processing…" : "Approve"}
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
