"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  MeterwiseOverview,
  MeterwiseProject,
  MeterwiseSyncLog,
  MeterwiseProviderAccount,
} from "@/lib/meterwise/client";

type DashboardData = {
  overview: MeterwiseOverview;
  projects: MeterwiseProject[];
  syncLogs: MeterwiseSyncLog[];
  providerAccounts: MeterwiseProviderAccount[];
};

type LoadState =
  | { kind: "loading" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: DashboardData };

// Categorical palette, dark-surface steps (validated order — see dataviz skill palette.md).
// Assigned to providers by stable alphabetical key, independent of cost ranking,
// so a provider keeps its color as spend shifts week to week.
const CATEGORICAL = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const STATUS_COLOR: Record<string, string> = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPercent(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const clamped = Math.max(-999, Math.min(999, n));
  const sign = clamped > 0 ? "+" : "";
  const suffix = Math.abs(n) > 999 ? "+" : "";
  return `${sign}${clamped.toFixed(0)}%${suffix}`;
}

function fmtRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Cost going up is bad, going down is good — inverted from a typical "growth" delta.
function deltaClass(changePercent: number): string {
  if (!Number.isFinite(changePercent) || changePercent === 0) return "text-white/40";
  return changePercent > 0 ? "text-red-400" : "text-emerald-400";
}

function statusMeta(status: string): { label: string; color: string } {
  const s = status.toLowerCase();
  if (s === "success") return { label: "Synced", color: STATUS_COLOR.good };
  if (s === "partial") return { label: "Partial", color: STATUS_COLOR.warning };
  if (s === "failed" || s === "error") return { label: "Failed", color: STATUS_COLOR.critical };
  return { label: status, color: STATUS_COLOR.warning };
}

function buildProviderColors(keys: string[]): Record<string, string> {
  const ordered = Array.from(new Set(keys)).sort();
  const map: Record<string, string> = {};
  ordered.forEach((key, i) => { map[key] = CATEGORICAL[i % CATEGORICAL.length]; });
  return map;
}

function StatTile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="text-xs text-white/40">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${alert ? "text-amber-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

export default function MeterwiseDashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ kind: "loading" });
      try {
        const res = await fetch("/api/admin/meterwise/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 409) {
          setState({ kind: "not_configured" });
        } else if (!res.ok) {
          setState({ kind: "error", message: data.error ?? "Failed to load Meterwise dashboard" });
        } else {
          setState({ kind: "ready", data });
        }
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Failed to reach the backoffice API" });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const ready = state.kind === "ready" ? state.data : null;

  const providerColors = useMemo(
    () => buildProviderColors((ready?.overview.providerBreakdown ?? []).map((p) => p.providerKey)),
    [ready]
  );

  const sortedProviders = useMemo(
    () => [...(ready?.overview.providerBreakdown ?? [])].sort((a, b) => b.mtdCost - a.mtdCost),
    [ready]
  );
  const maxProviderCost = sortedProviders[0]?.mtdCost || 1;

  const topProjects = useMemo(
    () => [...(ready?.projects ?? [])].sort((a, b) => b.mtdCost - a.mtdCost).slice(0, 8),
    [ready]
  );
  const maxProjectCost = topProjects[0]?.mtdCost || 1;

  const recentSyncLogs = useMemo(
    () => [...(ready?.syncLogs ?? [])].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)).slice(0, 8),
    [ready]
  );
  const recentIssueCount = recentSyncLogs.filter((l) => l.errorCount > 0).length;

  const pacePercent = ready ? Math.min(100, Math.round((ready.overview.daysElapsed / Math.max(ready.overview.daysInMonth, 1)) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Meterwise</h1>
        <p className="mt-1 text-sm text-white/40">Live from your connected Meterwise workspace.</p>
      </div>

      {state.kind === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/3" />
          ))}
        </div>
      )}

      {state.kind === "not_configured" && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-8 text-center">
          <p className="text-sm text-white/60">Meterwise isn&apos;t connected yet.</p>
          <Link
            href="/admin/settings/meterwise"
            className="mt-4 inline-block rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-sky-400"
          >
            Connect Meterwise
          </Link>
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{state.message}</div>
      )}

      {ready && (
        <>
          {/* Hero: MTD spend + month pace */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-white/40">Month-to-date spend</div>
                <div className="mt-1 text-5xl font-semibold text-white">{fmtMoney(ready.overview.mtdCost)}</div>
                <div className="mt-1 text-sm text-white/40">Projected {fmtMoney(ready.overview.projectedMonthlyCost)} this month</div>
              </div>
              <div className="w-full max-w-xs sm:w-64">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Day {ready.overview.daysElapsed} of {ready.overview.daysInMonth}</span>
                  <span>{pacePercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sky-500/15">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${pacePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Connected providers" value={String(ready.providerAccounts.length)} />
            <StatTile label="Active projects" value={String(ready.projects.filter((p) => p.mtdCost > 0).length)} />
            <StatTile label="Avg. daily spend" value={fmtMoney(ready.overview.mtdCost / Math.max(ready.overview.daysElapsed, 1))} />
            <StatTile
              label="Sync issues (recent)"
              value={recentIssueCount > 0 ? String(recentIssueCount) : "All clear"}
              alert={recentIssueCount > 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Cost by provider */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-semibold text-white">Cost by provider</h2>
              <p className="mb-4 mt-1 text-xs text-white/40">Month-to-date, by connected service</p>
              {sortedProviders.length === 0 ? (
                <p className="text-sm text-white/40">No provider spend yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedProviders.map((p) => {
                    const pct = (p.mtdCost / maxProviderCost) * 100;
                    const color = providerColors[p.providerKey];
                    return (
                      <div key={p.providerKey}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-white/80">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                            {p.providerName}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`text-xs ${deltaClass(p.changePercent)}`}>{fmtPercent(p.changePercent)}</span>
                            <span className="font-medium text-white">{fmtMoney(p.mtdCost)}</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5">
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top projects */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-semibold text-white">Top projects by spend</h2>
              <p className="mb-4 mt-1 text-xs text-white/40">Month-to-date vs. previous month</p>
              {topProjects.length === 0 ? (
                <p className="text-sm text-white/40">No projects yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {topProjects.map((project) => {
                    const pct = (project.mtdCost / maxProjectCost) * 100;
                    const changePercent = project.prevMonthCost > 0
                      ? ((project.mtdCost - project.prevMonthCost) / project.prevMonthCost) * 100
                      : (project.mtdCost > 0 ? 100 : 0);
                    return (
                      <div key={project.id} className="flex items-center gap-3">
                        <div className="w-28 shrink-0 truncate text-sm text-white/80 sm:w-36" title={project.name}>{project.name}</div>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div className="h-2 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-white">{fmtMoney(project.mtdCost)}</div>
                        <div className={`w-12 shrink-0 text-right text-xs tabular-nums ${deltaClass(changePercent)}`}>{fmtPercent(changePercent)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {ready.projects.length > topProjects.length && (
                <p className="mt-3 text-xs text-white/40">+{ready.projects.length - topProjects.length} more projects</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Sync activity */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-semibold text-white">Sync activity</h2>
              {recentSyncLogs.length === 0 ? (
                <p className="mt-4 text-sm text-white/40">No sync activity yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-white/8">
                  {recentSyncLogs.map((log) => {
                    const meta = statusMeta(log.status);
                    return (
                      <div key={log.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <span className="w-20 shrink-0 truncate text-white/80">{log.provider.name}</span>
                        <span className="w-14 shrink-0 text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="flex-1 truncate text-xs text-white/40">
                          {log.errorCount > 0 ? (log.errors?.[0] ?? `${log.errorCount} error(s)`) : `${log.recordsIngested.toLocaleString()} records`}
                        </span>
                        <span className="w-14 shrink-0 text-right text-xs text-white/35">{fmtRelativeTime(log.startedAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Connected accounts */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h2 className="text-sm font-semibold text-white">Connected accounts</h2>
              {ready.providerAccounts.length === 0 ? (
                <p className="mt-4 text-sm text-white/40">No connected accounts yet.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ready.providerAccounts.map((acc) => {
                    const ok = acc.credentialStatus === "valid";
                    return (
                      <span key={acc.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ok ? STATUS_COLOR.good : STATUS_COLOR.critical }} />
                        {acc.provider.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
