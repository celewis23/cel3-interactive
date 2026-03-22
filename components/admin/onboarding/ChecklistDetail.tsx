"use client";

import { useState } from "react";
import Link from "next/link";

const ACTION_LABELS: Record<string, string> = {
  "send-contract": "Send Contract",
  "send-estimate": "Send Estimate",
  "schedule-call": "Schedule Kickoff Call",
  "create-project": "Create Project",
  "request-file": "Request File Upload",
  "invite-portal": "Invite to Portal",
  "manual": "",
};

const STEP_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-400",
  complete: "bg-green-500/10 text-green-400",
  skipped: "bg-gray-500/10 text-gray-300",
  blocked: "bg-red-500/10 text-red-400",
};

interface Step {
  _key: string;
  order: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  actionType: string;
  status: string;
  completedAt: string | null;
  notes: string | null;
}

interface Instance {
  _id: string;
  templateName: string | null;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  pipelineContactId: string | null;
  stripeCustomerId: string | null;
  portalUserId: string | null;
  startDate: string;
  status: string;
  steps: Step[];
  notes: string | null;
}

interface Props {
  instance: Instance;
}

function buildActionUrl(
  actionType: string,
  client: { name: string; email: string | null; company: string | null; pipelineContactId: string | null }
): string {
  const params = new URLSearchParams();
  if (client.name) params.set("clientName", client.name);
  if (client.email) params.set("clientEmail", client.email);
  if (client.company) params.set("clientCompany", client.company);
  if (client.pipelineContactId) params.set("pipelineContactId", client.pipelineContactId);

  switch (actionType) {
    case "send-contract":
      return `/admin/contracts/new?${params}`;
    case "send-estimate":
      return `/admin/estimates/new?${params}`;
    case "schedule-call":
      return `/admin/calendar`;
    case "create-project":
      return `/admin/projects/new?${params}`;
    case "request-file":
      return `/admin/drive`;
    case "invite-portal":
      return `/admin/portal-users`;
    default:
      return "";
  }
}

export default function ChecklistDetail({ instance: initial }: Props) {
  const [instance, setInstance] = useState(initial);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const { done, total, pct } = (() => {
    const steps = instance.steps ?? [];
    const done = steps.filter((s) => ["complete", "skipped"].includes(s.status)).length;
    const total = steps.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  })();

  const overdueCount = (instance.steps ?? []).filter(
    (s) => s.dueDate && s.dueDate < today && s.status === "pending"
  ).length;

  async function updateStep(key: string, status: string, notes?: string) {
    setUpdating(key);
    try {
      const res = await fetch(`/api/admin/onboarding/${instance._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepKey: key,
          stepStatus: status,
          ...(notes !== undefined ? { stepNotes: notes } : {}),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInstance(updated);
      }
    } finally {
      setUpdating(null);
    }
  }

  async function updateInstanceStatus(status: string) {
    const res = await fetch(`/api/admin/onboarding/${instance._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInstance(updated);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="text-lg font-semibold text-white">{instance.clientName}</div>
            {instance.clientCompany && <div className="text-sm text-white/50">{instance.clientCompany}</div>}
            {instance.clientEmail && <div className="text-sm text-white/40">{instance.clientEmail}</div>}
            {instance.templateName && (
              <div className="text-xs text-white/30 mt-1">{instance.templateName}</div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {overdueCount > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {overdueCount} overdue
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
              instance.status === "active" ? "bg-sky-500/10 text-sky-400" :
              instance.status === "completed" ? "bg-green-500/10 text-green-400" :
              "bg-gray-500/10 text-gray-400"
            }`}>
              {instance.status}
            </span>
            {instance.status === "active" && (
              <button
                onClick={() => updateInstanceStatus("archived")}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                Archive
              </button>
            )}
            {instance.status === "archived" && (
              <button
                onClick={() => updateInstanceStatus("active")}
                className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/50">
            {done} of {total} steps complete
          </span>
          <span className="text-sm font-semibold text-white">{pct}%</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct === 100 ? "bg-green-400" : overdueCount > 0 ? "bg-orange-400" : "bg-sky-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 text-xs text-white/30">
          Started {instance.startDate}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {(instance.steps ?? []).map((step, idx) => {
          const isOverdue = step.dueDate && step.dueDate < today && step.status === "pending";
          const actionUrl = buildActionUrl(step.actionType, {
            name: instance.clientName,
            email: instance.clientEmail,
            company: instance.clientCompany,
            pipelineContactId: instance.pipelineContactId,
          });
          const isUpdating = updating === step._key;

          return (
            <div
              key={step._key}
              className={`bg-white/3 border rounded-xl px-5 py-4 transition-colors ${
                step.status === "complete"
                  ? "border-green-500/15 opacity-80"
                  : isOverdue
                  ? "border-orange-500/30"
                  : "border-white/8"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step number / complete indicator */}
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === "complete" ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-green-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  ) : step.status === "skipped" ? (
                    <div className="w-6 h-6 rounded-full bg-gray-500/15 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">—</span>
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isOverdue ? "border-orange-400/60" : "border-white/20"
                    }`}>
                      <span className="text-xs text-white/30">{idx + 1}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className={`text-sm font-medium ${
                        step.status === "complete" ? "line-through text-white/40" : "text-white"
                      }`}>
                        {step.title}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 text-xs text-orange-400">Overdue</span>
                      )}
                      {step.status !== "manual" && ACTION_LABELS[step.actionType] && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400/70">
                          {ACTION_LABELS[step.actionType]}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${STEP_STATUS_STYLES[step.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                      {step.status}
                    </span>
                  </div>

                  {step.description && (
                    <div className="text-xs text-white/40 mt-1">{step.description}</div>
                  )}

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {step.dueDate && (
                      <span className={`text-xs ${isOverdue ? "text-orange-400" : "text-white/30"}`}>
                        Due {step.dueDate}
                      </span>
                    )}
                    {step.completedAt && (
                      <span className="text-xs text-green-400/70">
                        Completed {new Date(step.completedAt).toLocaleDateString()}
                      </span>
                    )}
                    {step.notes && (
                      <span className="text-xs text-white/30 italic truncate max-w-xs">
                        &ldquo;{step.notes}&rdquo;
                      </span>
                    )}
                  </div>

                  {/* Actions row */}
                  {instance.status !== "archived" && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {step.status !== "complete" && (
                        <button
                          onClick={() => updateStep(step._key, "complete")}
                          disabled={isUpdating}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? "…" : "Mark Complete"}
                        </button>
                      )}
                      {step.status === "complete" && (
                        <button
                          onClick={() => updateStep(step._key, "pending")}
                          disabled={isUpdating}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          Undo
                        </button>
                      )}
                      {step.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStep(step._key, "blocked")}
                            disabled={isUpdating}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Flag Blocked
                          </button>
                          <button
                            onClick={() => updateStep(step._key, "skipped")}
                            disabled={isUpdating}
                            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            Skip
                          </button>
                        </>
                      )}
                      {step.status === "blocked" && (
                        <button
                          onClick={() => updateStep(step._key, "pending")}
                          disabled={isUpdating}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          Unblock
                        </button>
                      )}
                      {/* Linked action button */}
                      {step.actionType !== "manual" && actionUrl && step.status !== "complete" && (
                        <Link
                          href={actionUrl}
                          className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
                        >
                          {ACTION_LABELS[step.actionType]} →
                        </Link>
                      )}
                      {/* Notes toggle */}
                      <button
                        onClick={() => {
                          if (notesOpen === step._key) {
                            setNotesOpen(null);
                          } else {
                            setNotesDraft(step.notes ?? "");
                            setNotesOpen(step._key);
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {step.notes ? "Edit Note" : "Add Note"}
                      </button>
                    </div>
                  )}

                  {/* Notes input */}
                  {notesOpen === step._key && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateStep(step._key, step.status, notesDraft);
                            setNotesOpen(null);
                          }
                          if (e.key === "Escape") setNotesOpen(null);
                        }}
                        placeholder="Add a note…"
                        autoFocus
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
                      />
                      <button
                        onClick={() => {
                          updateStep(step._key, step.status, notesDraft);
                          setNotesOpen(null);
                        }}
                        className="text-xs px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {instance.notes && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Internal Notes</div>
          <div className="text-sm text-white/60">{instance.notes}</div>
        </div>
      )}
    </div>
  );
}
