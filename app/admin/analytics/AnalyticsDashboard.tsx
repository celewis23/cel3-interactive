"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

type Lead = {
  _id: string;
  name?: unknown;
  company?: unknown;
  budget?: unknown;
  services?: unknown;
  createdAt?: unknown;
};

type Booking = {
  _id: string;
  customerName?: unknown;
  customerEmail?: unknown;
  startsAtUtc?: unknown;
  status?: unknown;
};

type Analytics = {
  totals: { projects: unknown; leads: unknown; bookings: unknown };
  recentLeads: Lead[];
  recentBookings: Booking[];
  monthlyLeads: Array<{ month: string; count: number }>;
  budgetBreakdown: Record<string, number>;
};

// Safe coercions — prevents React error #31 (objects as children)
function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return ""; // drop objects silently
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function safeServices(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s) => typeof s === "string") as string[];
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniBar({ data }: { data: Array<{ month: string; count: number }> }) {
  if (!data.length) return <div className="text-sm text-white/25 py-4">No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-sky-500/30 rounded-t-sm"
            style={{ height: `${(d.count / max) * 80}px` }}
          />
          <span className="text-xs text-white/25 truncate w-full text-center">
            {d.month.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!d?.totals) throw new Error("Unexpected response shape");
        setData(d);
        setLoading(false);
      })
      .catch((e) => { setError(e.message || "Failed to load analytics"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-400 text-sm">{error || "No data"}</div>;
  }

  const budgetColors: Record<string, string> = {
    "$3k–$5k": "bg-sky-500/20 text-sky-300",
    "$5k–$10k": "bg-blue-500/20 text-blue-300",
    "$10k–$25k": "bg-indigo-500/20 text-indigo-300",
    "$25k+": "bg-violet-500/20 text-violet-300",
  };

  return (
    <div className="space-y-8">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Case Studies" value={num(data.totals.projects)} sub="published" />
        <StatCard label="Fit Requests" value={num(data.totals.leads)} sub="total leads" />
        <StatCard label="Assessments Booked" value={num(data.totals.bookings)} sub="confirmed" />
      </div>

      {/* Monthly leads chart */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
          Leads — Last 6 Months
        </h2>
        <MiniBar data={data.monthlyLeads ?? []} />
      </div>

      {/* Budget breakdown */}
      {Object.keys(data.budgetBreakdown ?? {}).length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Budget Ranges</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.budgetBreakdown).map(([budget, count]) => (
              <span key={budget} className={`px-3 py-1 rounded-full text-sm ${budgetColors[budget] || "bg-white/10 text-white/60"}`}>
                {budget} <strong>({count})</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Recent Fit Requests</h2>
          {(data.recentLeads ?? []).length === 0 ? (
            <p className="text-sm text-white/25">No leads yet</p>
          ) : (
            <ul className="space-y-3">
              {(data.recentLeads ?? []).map((l) => {
                const createdStr = str(l.createdAt);
                const relTime = createdStr ? DateTime.fromISO(createdStr).toRelative() : null;
                const services = safeServices(l.services);
                const budget = str(l.budget);
                return (
                  <li key={l._id} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{str(l.name)}</span>
                      {relTime && <span className="text-xs text-white/30">{relTime}</span>}
                    </div>
                    {str(l.company) && <span className="text-xs text-white/40">{str(l.company)}</span>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {budget && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${budgetColors[budget] || "bg-white/10 text-white/50"}`}>
                          {budget}
                        </span>
                      )}
                      {services.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{s}</span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Recent Assessments</h2>
          {(data.recentBookings ?? []).length === 0 ? (
            <p className="text-sm text-white/25">No bookings yet</p>
          ) : (
            <ul className="space-y-3">
              {(data.recentBookings ?? []).map((b) => {
                const startsAt = str(b.startsAtUtc);
                const formatted = startsAt
                  ? DateTime.fromISO(startsAt, { zone: "utc" }).setZone("America/New_York").toFormat("ccc, LLL d 'at' h:mm a")
                  : "";
                const status = str(b.status);
                return (
                  <li key={b._id} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{str(b.customerName)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === "CONFIRMED" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                      }`}>{status}</span>
                    </div>
                    {str(b.customerEmail) && <span className="text-xs text-white/40">{str(b.customerEmail)}</span>}
                    {formatted && <span className="text-xs text-white/30">{formatted} ET</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* GA Link */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Google Analytics</h2>
          <p className="text-xs text-white/40 mt-0.5">Traffic, sessions, and page views — GA4 property G-G1FLY7YQQB</p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 hover:border-white/25 text-sm text-white/60 hover:text-white transition-colors"
        >
          Open GA4
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    </div>
  );
}
