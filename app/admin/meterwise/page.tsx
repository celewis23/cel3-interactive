"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  overview: Record<string, unknown>;
  projects: unknown;
  syncLogs: unknown;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "not_configured" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: DashboardData };

function labelize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "—";
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const nested = Object.values(value as Record<string, unknown>).find((v) => Array.isArray(v));
    if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  }
  return [];
}

function RecordTable({ rows, emptyLabel }: { rows: Record<string, unknown>[]; emptyLabel: string }) {
  if (!rows.length) {
    return <p className="text-sm text-white/40">{emptyLabel}</p>;
  }
  const columns = Object.keys(rows[0]).filter((key) => isPrimitive(rows[0][key])).slice(0, 6);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-white/40">
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">{labelize(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/8 text-white/80">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-3 py-2">{formatValue(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

      {state.kind === "ready" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(state.data.overview ?? {})
              .filter(([, value]) => isPrimitive(value))
              .map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/8 bg-white/3 p-5">
                  <div className="text-xs text-white/40">{labelize(key)}</div>
                  <div className="mt-1 text-xl font-semibold text-white">{formatValue(value)}</div>
                </div>
              ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Projects</h2>
            <RecordTable rows={asArray(state.data.projects)} emptyLabel="No projects yet." />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Sync logs</h2>
            <RecordTable rows={asArray(state.data.syncLogs)} emptyLabel="No sync activity yet." />
          </div>
        </>
      )}
    </div>
  );
}
