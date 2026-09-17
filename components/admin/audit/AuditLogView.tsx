"use client";

import { useEffect, useState } from "react";

type ActivityEvent = {
  _id: string; timestamp: string; userName: string; userEmail: string; action: string;
  description: string; resourceLabel?: string; resourceId?: string; source: string; status: string;
  runId?: string; durationMs?: number; before?: Record<string, unknown>; after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
type Job = {
  id: string; name: string; description: string; schedule: string | null; health: string;
  collectionsEnabled?: boolean | null; lastRun: ActivityEvent | null;
};
type Filters = { q: string; source: string; status: string; from: string; to: string; runId: string; resourceId: string; hideRoutine: boolean };
const EMPTY: Filters = { q: "", source: "", status: "", from: "", to: "", runId: "", resourceId: "", hideRoutine: true };
const LIMIT = 50;
const inputClass = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-400";
const buttonClass = "rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-40";
const labels: Record<string, string> = {
  success: "Succeeded", failed: "Failed", partial: "Completed with errors", skipped: "Skipped / no work due",
  running: "Running", accepted: "Accepted for processing", recorded: "Recorded · outcome unavailable",
  unobserved: "No run recorded", overdue: "Expected run missing", unfinished: "Completion not recorded",
};

function timestamp(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }); }
function Badge({ status }: { status: string }) {
  const color = status === "success" ? "bg-emerald-500/15 text-emerald-300" : status === "failed" ? "bg-red-500/15 text-red-300"
    : ["partial", "overdue", "unfinished"].includes(status) ? "bg-amber-500/15 text-amber-200"
    : ["running", "accepted"].includes(status) ? "bg-sky-500/15 text-sky-300" : "bg-white/8 text-white/60";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{labels[status] ?? status}</span>;
}
function scheduleLabel(schedule: string | null) {
  if (schedule === "* * * * *") return "Checks every minute";
  if (schedule === "0 13 * * *") {
    const date = new Date(); date.setUTCHours(13, 0, 0, 0);
    const local = date.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    return `Daily at ${local} (13:00 UTC)`;
  }
  return schedule ?? "Not scheduled here";
}
function queryParams(filters: Filters) {
  const params = new URLSearchParams();
  for (const key of ["q", "source", "status", "runId", "resourceId"] as const) if (filters[key]) params.set(key, filters[key]);
  for (const key of ["from", "to"] as const) {
    if (!filters[key]) continue;
    const date = new Date(`${filters[key]}T00:00:00`);
    if (key === "to") date.setHours(23, 59, 59, 999);
    if (Number.isFinite(date.getTime())) params.set(key, date.toISOString());
  }
  params.set("hideRoutine", String(filters.hideRoutine));
  return params;
}

export default function AuditLogView() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobError, setJobError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [automaticRefresh, setAutomaticRefresh] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!automaticRefresh) return;
    const timer = setInterval(() => { if (!document.hidden) setRefresh((value) => value + 1); }, 30_000);
    return () => clearInterval(timer);
  }, [automaticRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const params = queryParams(applied);
      params.set("offset", String(offset)); params.set("limit", String(LIMIT));
      try {
        const response = await fetch(`/api/admin/audit?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 403 ? "You do not have permission to view the activity log." : "Activity history could not be loaded. Your previous results are still shown.");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setEvents(data.events ?? []); setTotal(data.total ?? 0); setError(""); setRefreshedAt(new Date().toISOString());
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Activity history could not be loaded.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [applied, offset, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/audit/jobs", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Job status could not be loaded."); return response.json(); })
      .then((data) => { if (!controller.signal.aborted) { setJobs(data.jobs ?? []); setJobError(""); } })
      .catch((err) => { if (!controller.signal.aborted) setJobError(err.message); });
    return () => controller.abort();
  }, [refresh]);

  function apply(next: Filters) { setFilters(next); setApplied(next); setOffset(0); setLoading(true); }
  async function exportCsv() {
    setExporting(true);
    try {
      const params = queryParams(applied); params.set("format", "csv");
      const response = await fetch(`/api/admin/audit?${params}`);
      if (!response.ok) throw new Error("Export failed. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "Export failed."); }
    finally { setExporting(false); }
  }

  return <div className="space-y-7">
    <section aria-labelledby="automatic-jobs-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="automatic-jobs-title" className="font-semibold text-white">Automatic jobs</h2>
          <p className="mt-1 text-xs text-white/45">A schedule shows what is expected. A recorded run confirms what actually happened.</p></div>
        <button className={buttonClass} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
      </div>
      {jobError && <p role="alert" className="mb-3 text-sm text-amber-300">{jobError}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => <article key={job.id} className="rounded-xl border border-white/10 bg-white/3 p-4">
          <div className="mb-2 font-medium text-white">{job.name}</div>
          <Badge status={job.health} />
          <p className="mt-3 text-xs text-white/65">{scheduleLabel(job.schedule)}</p>
          <p className="mt-1 text-xs text-white/45">{job.description}</p>
          {job.id === "billing-enforcement" && <p className={`mt-2 text-xs ${job.collectionsEnabled ? "text-emerald-300" : "text-amber-200"}`}>
            {job.collectionsEnabled === null ? "Collections setting unavailable" : job.collectionsEnabled ? "Automatic collections enabled" : "Automatic collections off"}
            {" · "}<a className="underline" href="/admin/settings/billing-enforcement">Billing settings</a>
          </p>}
          <p className="mt-3 text-xs text-white/60">{job.lastRun ? `Last attempt: ${timestamp(job.lastRun.timestamp)}` : "No run has been recorded since tracking was added."}</p>
          {job.lastRun && <p className="mt-1 text-xs text-white/45">{job.lastRun.description}</p>}
          <button className="mt-3 text-xs text-sky-300 hover:underline" onClick={() => apply({ ...EMPTY, resourceId: job.id, hideRoutine: false })}>View run history →</button>
        </article>)}
      </div>
      <p className="mt-3 text-xs text-white/35">“Not scheduled here” means this deployment has no built-in schedule for that job. External schedulers are visible when they call it.</p>
    </section>

    <section aria-labelledby="activity-history-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-history-title" className="font-semibold text-white">Activity history</h2>
        <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={automaticRefresh} onChange={(e) => setAutomaticRefresh(e.target.checked)} />Refresh every 30 seconds</label>
      </div>
      <form className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-4" onSubmit={(e) => { e.preventDefault(); apply(filters); }}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs text-white/60">Search<input className={`${inputClass} mt-1`} placeholder="Client, invoice, action, or person" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
          <label className="text-xs text-white/60">Source<select className={`${inputClass} mt-1`} value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option value="">All sources</option><option value="manual">Manual</option><option value="automatic">Automatic</option><option value="external">External integration</option>
          </select></label>
          <label className="text-xs text-white/60">Outcome<select className={`${inputClass} mt-1`} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, hideRoutine: e.target.value === "skipped" ? false : filters.hideRoutine })}>
            <option value="">All outcomes</option>{["success", "failed", "partial", "skipped", "running", "accepted", "recorded"].map((status) => <option key={status} value={status}>{labels[status]}</option>)}
          </select></label>
          <label className="text-xs text-white/60">From<input type="date" className={`${inputClass} mt-1`} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
          <label className="text-xs text-white/60">Through<input type="date" className={`${inputClass} mt-1`} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-black hover:bg-sky-400">Search</button>
          <button type="button" className={buttonClass} onClick={() => apply(EMPTY)}>Clear</button>
          <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={filters.hideRoutine} onChange={(e) => setFilters({ ...filters, hideRoutine: e.target.checked })} />Hide routine checks with no work</label>
          <button type="button" className={`${buttonClass} sm:ml-auto`} disabled={exporting} onClick={exportCsv}>{exporting ? "Exporting…" : "Export CSV"}</button>
        </div>
        {(applied.runId || applied.resourceId) && <p className="text-xs text-sky-300">Showing {applied.runId ? "one run and its related actions" : "history for the selected job"}. <button type="button" className="underline" onClick={() => apply(EMPTY)}>Show all activity</button></p>}
      </form>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-white/45">
        <span>{loading ? "Loading…" : `${total.toLocaleString()} recorded events`}</span>
        {refreshedAt && <span>Updated {timestamp(refreshedAt)} · times shown in your local timezone</span>}
      </div>
      <div className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10">
        {!events.length && <p className="p-10 text-center text-sm text-white/45">{loading ? "Loading activity…" : error ? "History is unavailable." : "No recorded activity matches these filters."}</p>}
        {events.map((event) => <article key={event._id} className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-white/90">{event.description}</p>
              <p className="mt-1 text-xs text-white/50">{event.userName} · {event.source === "automatic" ? "Automatic" : event.source === "external" ? "External integration" : "Manual"} · {timestamp(event.timestamp)}</p>
            </div><Badge status={event.status} />
          </div>
          {event.resourceLabel && <p className="mt-2 text-xs text-white/45">{event.resourceLabel}{event.durationMs != null ? ` · ${(event.durationMs / 1000).toFixed(1)}s` : ""}</p>}
          <details className="mt-3 text-xs text-white/55"><summary className="cursor-pointer select-none hover:text-white">Details</summary>
            <div className="mt-2 space-y-2">
              <p>Action: {event.action}</p>
              {event.resourceId && <p>Record: {event.resourceId}</p>}
              {event.before && <div>Before<pre className="mt-1 overflow-auto rounded bg-black/30 p-3">{JSON.stringify(event.before, null, 2)}</pre></div>}
              {event.after && <div>After<pre className="mt-1 overflow-auto rounded bg-black/30 p-3">{JSON.stringify(event.after, null, 2)}</pre></div>}
              {event.metadata && <pre className="overflow-auto rounded bg-black/30 p-3">{JSON.stringify(event.metadata, null, 2)}</pre>}
              {event.runId && <button className="text-sky-300 hover:underline" onClick={() => apply({ ...EMPTY, runId: event.runId!, hideRoutine: false })}>View all activity from this run →</button>}
            </div>
          </details>
        </article>)}
      </div>
      <div className="flex items-center justify-between">
        <button className={buttonClass} disabled={loading || offset === 0} onClick={() => { setOffset(Math.max(0, offset - LIMIT)); setLoading(true); }}>Previous</button>
        <span className="text-xs text-white/45">Page {Math.floor(offset / LIMIT) + 1} of {Math.max(1, Math.ceil(total / LIMIT))}</span>
        <button className={buttonClass} disabled={loading || offset + LIMIT >= total} onClick={() => { setOffset(offset + LIMIT); setLoading(true); }}>Next</button>
      </div>
      <p className="text-xs text-white/35">Older entries may not include an outcome. A successful send means the service accepted the message; it does not confirm delivery or that the recipient read it. CSV export includes up to 5,000 matching events.</p>
    </section>
  </div>;
}
