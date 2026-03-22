"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Step {
  _key: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  actionType: string;
  status: string;
}

interface Instance {
  _id: string;
  templateName: string | null;
  clientName: string;
  startDate: string;
  status: string;
  steps: Step[];
}

const CLIENT_ACTION_MAP: Record<string, { label: string; href: string }> = {
  "send-contract": { label: "Review & Sign Contract", href: "/portal/contracts" },
  "send-estimate": { label: "Review Estimate", href: "/portal/estimates" },
  "request-file": { label: "Upload File", href: "/portal/files" },
};

function getProgress(steps: Step[]) {
  if (!steps?.length) return { done: 0, total: 0, pct: 0 };
  const done = steps.filter((s) => ["complete", "skipped"].includes(s.status)).length;
  const total = steps.length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

export default function PortalOnboardingPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/onboarding")
      .then((r) => r.json())
      .then((d) => { setInstances(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>;
  }

  if (instances.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
        <div className="text-center py-16 text-gray-400 text-sm">
          No active onboarding checklist yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Getting Started</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your onboarding checklist — complete these steps to get your project started.
        </p>
      </div>

      {instances.map((instance) => {
        const { done, total, pct } = getProgress(instance.steps ?? []);
        const today = new Date().toISOString().slice(0, 10);

        const pendingClientSteps = (instance.steps ?? []).filter(
          (s) =>
            s.status === "pending" &&
            s.actionType in CLIENT_ACTION_MAP
        );

        const completedSteps = (instance.steps ?? []).filter((s) =>
          ["complete", "skipped"].includes(s.status)
        );

        const waitingSteps = (instance.steps ?? []).filter(
          (s) =>
            s.status === "pending" &&
            !(s.actionType in CLIENT_ACTION_MAP) &&
            s.actionType !== "manual"
        );

        const manualPendingSteps = (instance.steps ?? []).filter(
          (s) => s.status === "pending" && (s.actionType === "manual" || !(s.actionType in CLIENT_ACTION_MAP) && !(s.actionType in { "schedule-call": 1, "create-project": 1, "invite-portal": 1 }))
        );

        return (
          <div key={instance._id} className="space-y-4">
            {instance.templateName && (
              <div className="text-sm text-gray-500">{instance.templateName}</div>
            )}

            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {done} of {total} steps complete
                </span>
                <span className="text-sm font-semibold text-gray-900">{pct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct === 100 ? "bg-green-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {pct === 100 && (
                <div className="mt-3 text-sm text-green-600 font-medium">
                  ✓ Onboarding complete — welcome aboard!
                </div>
              )}
            </div>

            {/* Action required steps */}
            {pendingClientSteps.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Your action required
                </div>
                <div className="space-y-2">
                  {pendingClientSteps.map((step) => {
                    const action = CLIENT_ACTION_MAP[step.actionType];
                    const isOverdue = step.dueDate && step.dueDate < today;
                    return (
                      <div
                        key={step._key}
                        className={`bg-white rounded-xl border p-4 ${
                          isOverdue ? "border-orange-200" : "border-sky-200 ring-1 ring-sky-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{step.title}</div>
                            {step.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                            )}
                            {step.dueDate && (
                              <div className={`text-xs mt-1 ${isOverdue ? "text-orange-600" : "text-gray-400"}`}>
                                {isOverdue ? "Overdue — " : "Due "}
                                {step.dueDate}
                              </div>
                            )}
                          </div>
                          <Link
                            href={action.href}
                            className="flex-shrink-0 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
                          >
                            {action.label}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In progress / waiting */}
            {(waitingSteps.length > 0 || manualPendingSteps.filter(s => s.actionType === "manual").length > 0) && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  In progress
                </div>
                <div className="space-y-2">
                  {[...waitingSteps, ...manualPendingSteps.filter(s => s.actionType === "manual")].map((step) => (
                    <div key={step._key} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-700">{step.title}</div>
                          {step.dueDate && (
                            <div className="text-xs text-gray-400 mt-0.5">Due {step.dueDate}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedSteps.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Completed
                </div>
                <div className="space-y-1.5">
                  {completedSteps.map((step) => (
                    <div key={step._key} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-green-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-400 line-through">{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
