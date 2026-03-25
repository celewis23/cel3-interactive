"use client";

import { useState, useEffect } from "react";
import type { AutomationNode, AutomationTriggerType, AutomationRun } from "@/lib/automations/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  automationId: string | null;
  triggerType: AutomationTriggerType;
  nodes: AutomationNode[];
  onClose: () => void;
  onRunComplete: (run: AutomationRun) => void;
}

// ── Entity selector map ───────────────────────────────────────────────────────

type EntityCategory = "contract" | "invoice" | "lead" | "client" | "project" | "task" | "none";

function triggerToEntityCategory(t: AutomationTriggerType): EntityCategory {
  if (t.startsWith("contract_")) return "contract";
  if (t.startsWith("invoice_"))  return "invoice";
  if (t.startsWith("lead_"))     return "lead";
  if (t.startsWith("client_"))   return "client";
  if (t.startsWith("project_"))  return "project";
  if (t.startsWith("task_"))     return "task";
  if (t.startsWith("booking_") || t.startsWith("appointment_")) return "none"; // no entity picker
  return "none";
}

// ── Step result ───────────────────────────────────────────────────────────────

interface StepResult {
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  status: string;
  outputData?: Record<string, unknown>;
  error?: string;
  executeAt?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TestRunPanel({ automationId, triggerType, nodes, onClose, onRunComplete }: Props) {
  const entityCategory = triggerToEntityCategory(triggerType);

  const [entities, setEntities] = useState<Array<{ _id: string; name?: string; number?: string; title?: string }>>([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  // Load sample entities
  useEffect(() => {
    if (entityCategory === "none") return;

    const typeMap: Record<EntityCategory, string> = {
      contract: "contract",
      invoice:  "invoice",
      lead:     "contact",
      client:   "client",
      project:  "pmProject",
      task:     "pmTask",
      none:     "",
    };
    const sanityType = typeMap[entityCategory];
    if (!sanityType) return;

    fetch(`/api/admin/automations/test-entities?type=${sanityType}`)
      .then((r) => r.json())
      .then((d) => setEntities(d.entities ?? []))
      .catch(() => {});
  }, [entityCategory]);

  const runTest = async () => {
    if (!automationId) {
      setError("Save the automation first before running a test.");
      return;
    }

    setRunning(true);
    setResults(null);
    setError(null);
    setRunStatus(null);

    try {
      const res = await fetch("/api/admin/automations/test-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automationId,
          entityId: selectedEntityId || undefined,
          entityType: entityCategory !== "none" ? entityCategory : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Test run failed");
        return;
      }

      setResults(data.steps ?? []);
      setRunStatus(data.status ?? "completed");

      onRunComplete(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test run failed");
    } finally {
      setRunning(false);
    }
  };

  const entityName = (e: typeof entities[0]) => e.name ?? e.number ?? e.title ?? e._id;

  const stepColor = (status: string) => {
    switch (status) {
      case "completed":          return "text-emerald-400";
      case "failed":             return "text-red-400";
      case "skipped":            return "text-white/40";
      case "awaiting_approval":  return "text-amber-400";
      default:                   return "text-sky-400";
    }
  };

  const stepIcon = (status: string) => {
    switch (status) {
      case "completed": return "✓";
      case "failed":    return "✗";
      case "skipped":   return "○";
      case "pending":   return "⧖";
      default:          return "→";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-center bg-black/60">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <div>
            <div className="text-sm font-semibold text-white">Test run</div>
            <div className="text-xs text-white/40 mt-0.5">Simulates the automation with real data (no emails/SMS sent)</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Entity picker */}
          {entityCategory !== "none" && (
            <div>
              <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-2">
                Test against (optional)
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/40"
              >
                <option value="">— Any {entityCategory} (use mock data) —</option>
                {entities.map((e) => (
                  <option key={e._id} value={e._id}>{entityName(e)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dry run info */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300/80">
            <div className="font-semibold mb-1">🧪 Dry run mode</div>
            Emails, SMS, webhooks, and data changes will NOT fire. All steps are evaluated against real data and the trace is logged.
          </div>

          {/* Results */}
          {results && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Simulation trace</span>
                <span className={`text-xs font-semibold ${runStatus === "completed" ? "text-emerald-400" : "text-red-400"}`}>
                  {runStatus?.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                {results.map((step, i) => (
                  <div key={i} className="flex gap-3 bg-white/3 rounded-xl px-3 py-2.5">
                    <span className={`text-sm font-mono flex-shrink-0 mt-0.5 ${stepColor(step.status)}`}>
                      {stepIcon(step.status)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/70 font-medium truncate">{step.nodeLabel ?? step.nodeType}</span>
                        <span className={`text-[10px] font-semibold uppercase ${stepColor(step.status)}`}>{step.status}</span>
                      </div>
                      {!!step.outputData?.message && (
                        <div className="text-[11px] text-white/40 mt-0.5">{String(step.outputData.message)}</div>
                      )}
                      {step.executeAt && (
                        <div className="text-[11px] text-amber-400/60 mt-0.5">
                          Would execute at: {new Date(step.executeAt).toLocaleString()}
                        </div>
                      )}
                      {step.error && (
                        <div className="text-[11px] text-red-400/80 mt-0.5">{step.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/8 transition-colors"
          >
            Close
          </button>
          <button
            onClick={runTest}
            disabled={running}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-sm font-semibold transition-colors"
          >
            {running ? "Running…" : results ? "Run again" : "Run simulation"}
          </button>
        </div>
      </div>
    </div>
  );
}
