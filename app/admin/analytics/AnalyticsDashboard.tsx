"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

type Analytics = {
  totals: { projects: number; leads: number; bookings: number };
  recentLeads: Array<{
    _id: string;
    name: string;
    email: string;
    company?: string;
    budget?: string;
    services?: string[];
    createdAt: string;
  }>;
  recentBookings: Array<{
    _id: string;
    customerName: string;
    customerEmail: string;
    startsAtUtc: string;
    status: string;
  }>;
  monthlyLeads: Array<{ month: string; count: number }>;
  budgetBreakdown: Record<string, number>;
};

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
          <span className="text-xs text-white/25 rotate-0 truncate w-full text-center">
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
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics"); setLoading(false); });
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
        <StatCard label="Case Studies" value={data.totals.projects} sub="published" />
        <StatCard label="Fit Requests" value={data.totals.leads} sub="total leads" />
        <StatCard label="Assessments Booked" value={data.totals.bookings} sub="confirmed" />
      </div>

      {/* Monthly leads chart */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
          Leads — Last 6 Months
        </h2>
        <MiniBar data={data.monthlyLeads} />
      </div>

      {/* Budget breakdown */}
      {Object.keys(data.budgetBreakdown).length > 0 && (
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
          {data.recentLeads.length === 0 ? (
            <p className="text-sm text-white/25">No leads yet</p>
          ) : (
            <ul className="space-y-3">
              {data.recentLeads.map((l) => (
                <li key={l._id} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{l.name}</span>
                    <span className="text-xs text-white/30">
                      {DateTime.fromISO(l.createdAt).toRelative()}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">{l.email}{l.company ? ` · ${l.company}` : ""}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {l.budget && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${budgetColors[l.budget] || "bg-white/10 text-white/50"}`}>
                        {l.budget}
                      </span>
                    )}
                    {(l.services || []).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{s}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Recent Assessments</h2>
          {data.recentBookings.length === 0 ? (
            <p className="text-sm text-white/25">No bookings yet</p>
          ) : (
            <ul className="space-y-3">
              {data.recentBookings.map((b) => (
                <li key={b._id} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{b.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === "CONFIRMED" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                    }`}>{b.status}</span>
                  </div>
                  <span className="text-xs text-white/40">{b.customerEmail}</span>
                  <span className="text-xs text-white/30">
                    {DateTime.fromISO(b.startsAtUtc, { zone: "utc" }).setZone("America/New_York").toFormat("ccc, LLL d 'at' h:mm a")} ET
                  </span>
                </li>
              ))}
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
