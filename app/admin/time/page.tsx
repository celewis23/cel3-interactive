"use client";

import { useState } from "react";
import Link from "next/link";
import TimeLog from "@/components/admin/time/TimeLog";

export default function TimePage() {
  const [tab, setTab] = useState<"log" | "report">("log");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Backoffice</div>
          <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {(["log", "report"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm capitalize transition-colors ${
                  tab === t ? "bg-sky-500/10 text-sky-400" : "bg-white/3 text-white/40 hover:text-white"
                }`}
              >
                {t === "log" ? "Time Log" : "Reports"}
              </button>
            ))}
          </div>
          <Link
            href="/admin/time/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            + Add Entry
          </Link>
        </div>
      </div>

      {tab === "log" ? (
        <TimeLog />
      ) : (
        <TimeReport />
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function TimeReport() {
  const [data, setData] = useState<{
    week: { totalSeconds: number; billableSeconds: number; billableAmount: number; unbilledAmount: number };
    month: { totalSeconds: number; billableSeconds: number; billableAmount: number; unbilledAmount: number };
    year: { totalSeconds: number; billableSeconds: number; billableAmount: number; unbilledAmount: number };
    topClients: { name: string; seconds: number }[];
    topProjects: { name: string; seconds: number }[];
    unbilledByClient: Record<string, { seconds: number; amount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/time/report")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoaded(true); })
      .finally(() => setLoading(false));
  }

  if (!loaded) {
    return (
      <div className="text-center py-16">
        <button
          onClick={load}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {loading ? "Loading…" : "Load Report"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const periods = [
    { label: "This Week", d: data.week },
    { label: "This Month", d: data.month },
    { label: "This Year", d: data.year },
  ];

  return (
    <div className="space-y-6">
      {/* Period summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {periods.map(({ label, d }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-3">{label}</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Total hours</span>
                <span className="text-white font-medium">{formatDuration(d.totalSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Billable hours</span>
                <span className="text-sky-400">{formatDuration(d.billableSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Billable amount</span>
                <span className="text-white font-medium">{formatMoney(d.billableAmount)}</span>
              </div>
              {d.unbilledAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/50">Unbilled</span>
                  <span className="text-yellow-400">{formatMoney(d.unbilledAmount)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top clients */}
        {data.topClients.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Top Clients by Hours</div>
            <div className="space-y-3">
              {data.topClients.map((c, i) => {
                const pct = i === 0 ? 100 : Math.round((c.seconds / data.topClients[0].seconds) * 100);
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70 truncate">{c.name}</span>
                      <span className="text-white/50 flex-shrink-0 ml-2">{formatDuration(c.seconds)}</span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top projects */}
        {data.topProjects.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Top Projects by Hours</div>
            <div className="space-y-3">
              {data.topProjects.map((p, i) => {
                const pct = i === 0 ? 100 : Math.round((p.seconds / data.topProjects[0].seconds) * 100);
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70 truncate">{p.name}</span>
                      <span className="text-white/50 flex-shrink-0 ml-2">{formatDuration(p.seconds)}</span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unbilled by client */}
      {Object.keys(data.unbilledByClient).length > 0 && (
        <div className="bg-white/3 border border-yellow-500/20 rounded-xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Unbilled by Client</div>
          <div className="space-y-2">
            {Object.entries(data.unbilledByClient)
              .sort(([, a], [, b]) => b.amount - a.amount)
              .map(([name, { seconds, amount }]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{name}</span>
                  <div className="text-right">
                    <span className="text-yellow-400 font-medium">{formatMoney(amount)}</span>
                    <span className="text-white/30 ml-2">({formatDuration(seconds)})</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
