"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  _id: string;
  name?: unknown; company?: unknown; budget?: unknown;
  services?: unknown; createdAt?: unknown;
};
type Booking = {
  _id: string;
  customerName?: unknown; customerEmail?: unknown;
  startsAtUtc?: unknown; status?: unknown;
};
type Revenue = {
  thisMonth: number; lastMonth: number; currency: string;
  changePercent: number | null;
  outstanding: number; outstandingCount: number;
  overdue: number; overdueCount: number;
  monthly12: { month: string; amount: number }[];
  byClient: { name: string; amount: number }[];
};
type ProjectHealth = {
  activeProjects: number;
  projects: { _id: string; name: string; dueDate: string | null; total: number; done: number; pct: number }[];
  tasksDueToday: number;
  overdueTasks: number;
  tasksByColumn: Record<string, number>;
};
type CalEvent = { id: string; summary: string; start: string; allDay: boolean; htmlLink?: string };
type Analytics = {
  totals: { projects: unknown; leads: unknown; bookings: unknown };
  recentLeads: Lead[];
  recentBookings: Booking[];
  monthlyLeads: { month: string; count: number }[];
  budgetBreakdown: Record<string, number>;
  revenue: Revenue | null;
  projectHealth: ProjectHealth | null;
  upcomingEvents: CalEvent[] | null;
};

// ── Safe coercions ────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
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
function money(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ── Shared components ─────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/3 border border-white/8 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-0.5">{sub}</div>}
    </Card>
  );
}

// Original mini bar — leads chart
function MiniBar({ data }: { data: { month: string; count: number }[] }) {
  if (!data.length) return <div className="text-sm text-white/25 py-4">No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-sky-500/30 rounded-t-sm" style={{ height: `${(d.count / max) * 80}px` }} />
          <span className="text-xs text-white/25 truncate w-full text-center">{d.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

// Revenue bar chart — 12 months
function RevenueBar({ data }: { data: { month: string; amount: number }[] }) {
  if (!data.length) return <div className="text-sm text-white/25 py-4">No data yet</div>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d) => {
        const pct = (d.amount / max) * 100;
        const label = d.month.slice(5); // "MM"
        const monthName = new Date(`${d.month}-15`).toLocaleString("en-US", { month: "short" });
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/70 z-10 pointer-events-none">
              {monthName}: {d.amount > 0 ? money(d.amount) : "–"}
            </div>
            <div
              className={`w-full rounded-t-sm transition-all ${d.amount > 0 ? "bg-sky-500/50 group-hover:bg-sky-500/80" : "bg-white/5"}`}
              style={{ height: `${Math.max(pct, d.amount > 0 ? 4 : 1)}px`, maxHeight: "90px" }}
            />
            <span className="text-[10px] text-white/20 truncate w-full text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar — revenue by client
function ClientRevenueBar({ data, currency }: { data: { name: string; amount: number }[]; currency: string }) {
  if (!data.length) return <div className="text-sm text-white/25">No data yet</div>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-xs text-white/50 w-28 truncate text-right flex-shrink-0">{d.name || "Unknown"}</span>
          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500/60 rounded-full"
              style={{ width: `${(d.amount / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/50 w-16 text-right flex-shrink-0">{money(d.amount, currency)}</span>
        </div>
      ))}
    </div>
  );
}

// Progress bar for projects
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 rounded-full bg-white/8 overflow-hidden">
      <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Change indicator
function Change({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs last month
    </span>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const budgetColors: Record<string, string> = {
  "$3k–$5k": "bg-sky-500/20 text-sky-300",
  "$5k–$10k": "bg-blue-500/20 text-blue-300",
  "$10k–$25k": "bg-indigo-500/20 text-indigo-300",
  "$25k+": "bg-violet-500/20 text-violet-300",
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); })
      .then((d) => { if (!d?.totals) throw new Error("Unexpected response shape"); setData(d); setLoading(false); })
      .catch((e) => { setError(e.message || "Failed to load analytics"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-400 text-sm">{error || "No data"}</div>;
  }

  const rev = data.revenue;
  const pm = data.projectHealth;
  const events = data.upcomingEvents;

  return (
    <div className="space-y-8">

      {/* ── Business Overview ──────────────────────────────────────────────── */}
      {rev && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Business Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue this month */}
            <Card>
              <div className="text-2xl font-semibold text-white">{money(rev.thisMonth, rev.currency)}</div>
              <div className="text-sm text-white/50 mt-1">Revenue this month</div>
              <div className="mt-1.5">
                <Change pct={rev.changePercent} />
              </div>
            </Card>

            {/* Outstanding */}
            <Card>
              <div className="text-2xl font-semibold text-white">{money(rev.outstanding, rev.currency)}</div>
              <div className="text-sm text-white/50 mt-1">Outstanding</div>
              <div className="text-xs text-white/25 mt-0.5">{rev.outstandingCount} invoice{rev.outstandingCount !== 1 ? "s" : ""}</div>
              {rev.overdue > 0 && (
                <div className="text-xs text-red-400 mt-1">
                  {money(rev.overdue, rev.currency)} overdue
                </div>
              )}
            </Card>

            {/* Tasks */}
            {pm && (
              <Card>
                <div className="text-2xl font-semibold text-white">{pm.tasksDueToday}</div>
                <div className="text-sm text-white/50 mt-1">Tasks due today</div>
                {pm.overdueTasks > 0 && (
                  <div className="text-xs text-red-400 mt-1">{pm.overdueTasks} overdue</div>
                )}
                {pm.overdueTasks === 0 && (
                  <div className="text-xs text-white/25 mt-0.5">across {pm.activeProjects} project{pm.activeProjects !== 1 ? "s" : ""}</div>
                )}
              </Card>
            )}

            {/* Upcoming events */}
            {events && (
              <Card>
                <div className="text-2xl font-semibold text-white">{events.length}</div>
                <div className="text-sm text-white/50 mt-1">Events this week</div>
                {events[0] && (
                  <div className="text-xs text-white/25 mt-0.5 truncate">Next: {events[0].summary}</div>
                )}
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ── Revenue Charts ─────────────────────────────────────────────────── */}
      {rev && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Revenue</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 12-month trend */}
            <Card>
              <CardTitle>Monthly Revenue — Last 12 Months</CardTitle>
              <RevenueBar data={rev.monthly12} />
              <div className="flex justify-between mt-3 text-xs text-white/30">
                <span>Total paid: {money(rev.monthly12.reduce((s, m) => s + m.amount, 0), rev.currency)}</span>
              </div>
            </Card>

            {/* By client */}
            <Card>
              <CardTitle>Revenue by Client</CardTitle>
              <ClientRevenueBar data={rev.byClient} currency={rev.currency} />
            </Card>
          </div>

          {/* Paid vs outstanding vs overdue */}
          {(rev.outstanding > 0 || rev.overdue > 0) && (() => {
            const total = rev.thisMonth + rev.outstanding;
            const paidPct = total > 0 ? (rev.thisMonth / total) * 100 : 0;
            const outstandingPct = total > 0 ? ((rev.outstanding - rev.overdue) / total) * 100 : 0;
            const overduePct = total > 0 ? (rev.overdue / total) * 100 : 0;
            return (
              <Card>
                <CardTitle>Invoice Status</CardTitle>
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
                  {paidPct > 0 && <div className="bg-sky-500" style={{ width: `${paidPct}%` }} title="Paid" />}
                  {outstandingPct > 0 && <div className="bg-yellow-500/60" style={{ width: `${outstandingPct}%` }} title="Outstanding" />}
                  {overduePct > 0 && <div className="bg-red-500/70" style={{ width: `${overduePct}%` }} title="Overdue" />}
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500 flex-shrink-0" />
                    <span className="text-white/50">Paid this month</span>
                    <span className="text-white font-semibold">{money(rev.thisMonth, rev.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 flex-shrink-0" />
                    <span className="text-white/50">Outstanding</span>
                    <span className="text-white font-semibold">{money(rev.outstanding - rev.overdue, rev.currency)}</span>
                  </div>
                  {rev.overdue > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70 flex-shrink-0" />
                      <span className="text-white/50">Overdue</span>
                      <span className="text-red-400 font-semibold">{money(rev.overdue, rev.currency)}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}
        </section>
      )}

      {/* ── Project Health ─────────────────────────────────────────────────── */}
      {pm && pm.activeProjects > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Project Health</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Active Projects</CardTitle>
              {pm.projects.length === 0 ? (
                <p className="text-sm text-white/25">No active projects</p>
              ) : (
                <ul className="space-y-4">
                  {pm.projects.map((p) => {
                    const isOverdue = p.dueDate && p.dueDate < new Date().toISOString().slice(0, 10);
                    return (
                      <li key={p._id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <Link
                            href={`/admin/projects/${p._id}`}
                            className="text-sm text-white hover:text-sky-400 transition-colors truncate"
                          >
                            {p.name}
                          </Link>
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {p.done}/{p.total} tasks
                          </span>
                        </div>
                        <ProgressBar pct={p.pct} />
                        {(isOverdue || p.dueDate) && (
                          <div className={`text-[11px] mt-1 ${isOverdue ? "text-red-400" : "text-white/25"}`}>
                            Due {p.dueDate ? new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                            {isOverdue && " — overdue"}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle>Tasks by Status</CardTitle>
              {(() => {
                const entries = [
                  { id: "backlog", label: "Backlog", color: "bg-white/20" },
                  { id: "in-progress", label: "In Progress", color: "bg-sky-500/60" },
                  { id: "in-review", label: "In Review", color: "bg-yellow-500/60" },
                  { id: "done", label: "Done", color: "bg-green-500/60" },
                ];
                const total = Object.values(pm.tasksByColumn).reduce((s, n) => s + n, 0);
                if (total === 0) return <p className="text-sm text-white/25">No tasks yet</p>;
                return (
                  <div className="space-y-3">
                    {entries.map(({ id, label, color }) => {
                      const count = pm.tasksByColumn[id] ?? 0;
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/50">{label}</span>
                            <span className="text-white/40">{count}</span>
                          </div>
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-white/25 pt-1">{total} tasks total</p>
                  </div>
                );
              })()}
            </Card>
          </div>
        </section>
      )}

      {/* ── Upcoming Events ────────────────────────────────────────────────── */}
      {events && events.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Upcoming This Week</h2>
          <Card>
            <ul className="space-y-2">
              {events.map((ev) => {
                const dt = ev.allDay
                  ? DateTime.fromISO(ev.start).toFormat("ccc, LLL d")
                  : DateTime.fromISO(ev.start, { zone: "utc" })
                      .setZone("America/New_York")
                      .toFormat("ccc, LLL d 'at' h:mm a");
                return (
                  <li key={ev.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                    <span className="text-sm text-white flex-1 truncate">{ev.summary}</span>
                    <span className="text-xs text-white/30 flex-shrink-0">
                      {dt}{ev.allDay ? "" : " ET"}
                    </span>
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/20 hover:text-sky-400 transition-colors text-xs"
                      >
                        ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Existing: Totals ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Site Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Case Studies" value={num(data.totals.projects)} sub="published" />
          <StatCard label="Fit Requests" value={num(data.totals.leads)} sub="total leads" />
          <StatCard label="Assessments Booked" value={num(data.totals.bookings)} sub="confirmed" />
        </div>
      </section>

      {/* ── Existing: Leads chart ──────────────────────────────────────────── */}
      <Card>
        <CardTitle>Leads — Last 6 Months</CardTitle>
        <MiniBar data={data.monthlyLeads ?? []} />
      </Card>

      {/* ── Existing: Budget breakdown ─────────────────────────────────────── */}
      {Object.keys(data.budgetBreakdown ?? {}).length > 0 && (
        <Card>
          <CardTitle>Budget Ranges</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.budgetBreakdown).map(([budget, count]) => (
              <span key={budget} className={`px-3 py-1 rounded-full text-sm ${budgetColors[budget] || "bg-white/10 text-white/60"}`}>
                {budget} <strong>({count})</strong>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* ── Existing: Recent leads + bookings ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Recent Fit Requests</CardTitle>
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
        </Card>

        <Card>
          <CardTitle>Recent Assessments</CardTitle>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status === "CONFIRMED" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {status}
                      </span>
                    </div>
                    {str(b.customerEmail) && <span className="text-xs text-white/40">{str(b.customerEmail)}</span>}
                    {formatted && <span className="text-xs text-white/30">{formatted} ET</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ── GA Link ───────────────────────────────────────────────────────── */}
      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Google Analytics</h2>
          <p className="text-xs text-white/40 mt-0.5">Traffic, sessions, and page views — GA4 property G-G1FLY7YQQB</p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 hover:border-white/25 text-sm text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          Open GA4
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </Card>

    </div>
  );
}
