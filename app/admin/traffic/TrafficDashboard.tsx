"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

// ── Types ─────────────────────────────────────────────────────────────────────

type Metric = { current: number; previous: number };
type NullableMetric = { current: number | null; previous: number | null };
type ListRow = { label: string; visitors: number; views: number };
type PageRow = { label: string; views: number; visitors: number; avgSec: number | null };
type SeriesPoint = { bucket: string; pageviews: number; visitors: number; sessions: number };
type Granularity = "hour" | "day" | "month";

type TrafficData = {
  range: string;
  granularity: Granularity;
  realtime: number;
  summary: {
    visitors: Metric;
    pageviews: Metric;
    sessions: Metric;
    bounceRate: NullableMetric;
    avgDuration: NullableMetric;
  };
  timeseries: SeriesPoint[];
  pages: PageRow[];
  referrers: ListRow[];
  sources: ListRow[];
  campaigns: ListRow[];
  countries: ListRow[];
  devices: ListRow[];
  browsers: ListRow[];
  oses: ListRow[];
  events: ListRow[];
};

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];
type ChartMetric = "visitors" | "pageviews" | "sessions";

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

function fmtDuration(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function bucketLabel(bucket: string, granularity: Granularity): string {
  const dt = DateTime.fromISO(bucket);
  if (!dt.isValid) return bucket;
  if (granularity === "hour") return dt.toFormat("h a");
  if (granularity === "month") return dt.toFormat("LLL yyyy");
  return dt.toFormat("LLL d");
}

function countryName(code: string): string {
  if (code === "Unknown" || code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

// ── Shared pieces ─────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/3 border border-white/8 rounded-2xl p-5 ${className}`}>{children}</div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">{children}</h2>
  );
}

// Delta vs previous period; `invert` flips the good/bad color (bounce rate)
function Delta({ current, previous, invert = false, points = false }: {
  current: number | null;
  previous: number | null;
  invert?: boolean;
  points?: boolean;
}) {
  if (current === null || previous === null) return null;
  let text: string;
  let up: boolean;
  if (points) {
    const diff = current - previous;
    if (diff === 0) return <span className="text-xs text-white/25">no change</span>;
    up = diff > 0;
    text = `${Math.abs(diff)} pt${Math.abs(diff) !== 1 ? "s" : ""}`;
  } else {
    if (previous === 0) return null;
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return <span className="text-xs text-white/25">no change</span>;
    up = pct > 0;
    text = `${Math.abs(pct)}%`;
  }
  const good = invert ? !up : up;
  return (
    <span className={`text-xs font-semibold ${good ? "text-green-400" : "text-red-400"}`}>
      {up ? "↑" : "↓"} {text}
    </span>
  );
}

function StatTile({ label, value, delta }: { label: string; value: string; delta: React.ReactNode }) {
  return (
    <Card>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
      <div className="mt-1.5 h-4">{delta}</div>
    </Card>
  );
}

// ── Timeseries chart ──────────────────────────────────────────────────────────

const METRIC_LABELS: Record<ChartMetric, string> = {
  visitors: "Visitors",
  pageviews: "Pageviews",
  sessions: "Sessions",
};

function TrafficChart({ series, metric, granularity }: {
  series: SeriesPoint[];
  metric: ChartMetric;
  granularity: Granularity;
}) {
  if (!series.length) return <div className="text-sm text-white/25 py-8">No data yet</div>;
  const max = Math.max(...series.map((p) => p[metric]), 1);
  // Sparse x labels: at most ~7
  const labelEvery = Math.max(1, Math.ceil(series.length / 7));
  return (
    <div>
      <div className="relative">
        {/* recessive gridlines at 0 / 50 / 100% */}
        <div className="absolute inset-x-0 top-0 border-t border-white/5" />
        <div className="absolute inset-x-0 top-1/2 border-t border-white/5" />
        <div className="absolute right-0 -top-2 text-[10px] text-white/25">{fmtNum(max)}</div>
        <div className="flex items-end gap-px sm:gap-0.5 h-40">
          {series.map((p) => {
            const value = p[metric];
            const pct = (value / max) * 100;
            return (
              <div key={p.bucket} className="flex-1 h-full flex flex-col justify-end group relative min-w-0">
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white/70 z-10 pointer-events-none">
                  <div className="font-semibold text-white mb-0.5">{bucketLabel(p.bucket, granularity)}</div>
                  <div>Visitors: {fmtNum(p.visitors)}</div>
                  <div>Pageviews: {fmtNum(p.pageviews)}</div>
                  <div>Sessions: {fmtNum(p.sessions)}</div>
                </div>
                <div
                  className={`w-full rounded-t-[3px] transition-colors ${
                    value > 0 ? "bg-sky-500/50 group-hover:bg-sky-400/80" : "bg-white/5"
                  }`}
                  style={{ height: value > 0 ? `${Math.max(pct, 2)}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex mt-2">
        {series.map((p, i) => (
          <div key={p.bucket} className="flex-1 text-center min-w-0">
            {i % labelEvery === 0 && (
              <span className="text-[10px] text-white/25 whitespace-nowrap">
                {bucketLabel(p.bucket, granularity)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Breakdown list ────────────────────────────────────────────────────────────

function BreakdownList({ rows, valueKey = "visitors", valueLabel = "Visitors", format }: {
  rows: ListRow[];
  valueKey?: "visitors" | "views";
  valueLabel?: string;
  format?: (label: string) => string;
}) {
  if (!rows.length) return <p className="text-sm text-white/25">No data yet</p>;
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/25 mb-2">
        <span>Name</span>
        <span>{valueLabel}</span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="relative flex items-center justify-between gap-3 rounded-lg overflow-hidden px-2 py-1.5">
            <div
              className="absolute inset-y-0 left-0 bg-sky-500/12 rounded-lg"
              style={{ width: `${(r[valueKey] / max) * 100}%` }}
            />
            <span className="relative text-sm text-white/70 truncate">{format ? format(r.label) : r.label}</span>
            <span className="relative text-sm text-white/50 flex-shrink-0 tabular-nums">
              {fmtNum(r[valueKey])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function TrafficDashboard() {
  const [range, setRange] = useState<RangeId>("30d");
  const [metric, setMetric] = useState<ChartMetric>("visitors");
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [excluded, setExcluded] = useState(false);

  useEffect(() => {
    try {
      setExcluded(localStorage.getItem("c3_ignore") === "1");
    } catch {}
  }, []);

  const load = useCallback(async (r: RangeId, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/web?range=${r}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData((await res.json()) as TrafficData);
      setError("");
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
    const interval = setInterval(() => load(range, true), 60_000);
    return () => clearInterval(interval);
  }, [range, load]);

  function toggleExclude() {
    try {
      const next = !excluded;
      if (next) localStorage.setItem("c3_ignore", "1");
      else localStorage.removeItem("c3_ignore");
      setExcluded(next);
    } catch {}
  }

  const hasAnyData = useMemo(
    () => !!data && (data.summary.pageviews.current > 0 || data.summary.pageviews.previous > 0),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-56 rounded-2xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-400 text-sm">{error || "No data"}</div>;
  }

  const s = data.summary;

  return (
    <div className="space-y-8">

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.id ? "bg-sky-500/20 text-sky-300" : "text-white/40 hover:text-white/70"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white/50">
          <span className={`w-2 h-2 rounded-full ${data.realtime > 0 ? "bg-green-400 animate-pulse" : "bg-white/15"}`} />
          {data.realtime} online now
        </div>

        <button
          onClick={toggleExclude}
          className={`ml-auto px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            excluded
              ? "border-green-500/30 text-green-400"
              : "border-white/10 text-white/40 hover:text-white/70"
          }`}
          title="Stops counting visits from this browser"
        >
          {excluded ? "✓ Your visits excluded" : "Exclude my visits"}
        </button>
      </div>

      {!hasAnyData && (
        <Card>
          <p className="text-sm text-white/60">
            Tracking is live. Data will appear here as visitors browse the site — open the public
            site in another browser (or a private window) to see your first pageview.
          </p>
        </Card>
      )}

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatTile
          label="Unique visitors"
          value={fmtNum(s.visitors.current)}
          delta={<Delta current={s.visitors.current} previous={s.visitors.previous} />}
        />
        <StatTile
          label="Pageviews"
          value={fmtNum(s.pageviews.current)}
          delta={<Delta current={s.pageviews.current} previous={s.pageviews.previous} />}
        />
        <StatTile
          label="Sessions"
          value={fmtNum(s.sessions.current)}
          delta={<Delta current={s.sessions.current} previous={s.sessions.previous} />}
        />
        <StatTile
          label="Bounce rate"
          value={s.bounceRate.current !== null ? `${s.bounceRate.current}%` : "—"}
          delta={<Delta current={s.bounceRate.current} previous={s.bounceRate.previous} invert points />}
        />
        <StatTile
          label="Avg. visit time"
          value={fmtDuration(s.avgDuration.current)}
          delta={<Delta current={s.avgDuration.current} previous={s.avgDuration.previous} />}
        />
      </div>

      {/* ── Traffic over time ───────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
            {METRIC_LABELS[metric]} over time
          </h2>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(Object.keys(METRIC_LABELS) as ChartMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  metric === m ? "bg-sky-500/20 text-sky-300" : "text-white/40 hover:text-white/70"
                }`}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <TrafficChart series={data.timeseries} metric={metric} granularity={data.granularity} />
      </Card>

      {/* ── Pages + Referrers ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Top Pages</CardTitle>
          {!data.pages.length ? (
            <p className="text-sm text-white/25">No data yet</p>
          ) : (
            <div>
              <div className="flex text-[10px] uppercase tracking-wider text-white/25 mb-2">
                <span className="flex-1">Page</span>
                <span className="w-16 text-right">Views</span>
                <span className="w-16 text-right hidden sm:block">Visitors</span>
                <span className="w-16 text-right hidden sm:block">Time</span>
              </div>
              <ul className="space-y-1.5">
                {(() => {
                  const max = Math.max(...data.pages.map((p) => p.views), 1);
                  return data.pages.map((p) => (
                    <li key={p.label} className="relative flex items-center rounded-lg overflow-hidden px-2 py-1.5">
                      <div
                        className="absolute inset-y-0 left-0 bg-sky-500/12 rounded-lg"
                        style={{ width: `${(p.views / max) * 100}%` }}
                      />
                      <span className="relative flex-1 text-sm text-white/70 truncate">{p.label}</span>
                      <span className="relative w-16 text-right text-sm text-white/50 tabular-nums">{fmtNum(p.views)}</span>
                      <span className="relative w-16 text-right text-sm text-white/35 tabular-nums hidden sm:block">{fmtNum(p.visitors)}</span>
                      <span className="relative w-16 text-right text-xs text-white/35 hidden sm:block">{fmtDuration(p.avgSec)}</span>
                    </li>
                  ));
                })()}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Referrers</CardTitle>
          <BreakdownList rows={data.referrers} />
        </Card>
      </div>

      {/* ── Sources + Countries ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Traffic Sources</CardTitle>
          <BreakdownList rows={data.sources} />
          {data.campaigns.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Campaigns</h3>
              <BreakdownList rows={data.campaigns} />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Countries</CardTitle>
          <BreakdownList rows={data.countries} format={countryName} />
        </Card>
      </div>

      {/* ── Devices / Browsers / OS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardTitle>Devices</CardTitle>
          <BreakdownList rows={data.devices} />
        </Card>
        <Card>
          <CardTitle>Browsers</CardTitle>
          <BreakdownList rows={data.browsers} />
        </Card>
        <Card>
          <CardTitle>Operating Systems</CardTitle>
          <BreakdownList rows={data.oses} />
        </Card>
      </div>

      {/* ── Custom events ───────────────────────────────────────────────────── */}
      {data.events.length > 0 && (
        <Card>
          <CardTitle>Custom Events</CardTitle>
          <BreakdownList rows={data.events} valueKey="views" valueLabel="Count" />
        </Card>
      )}
    </div>
  );
}
