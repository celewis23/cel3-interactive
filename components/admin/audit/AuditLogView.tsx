"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEvent {
  _id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  isOwner: boolean;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceLabel: string | null;
  description: string;
  ipAddress: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

const LIMIT = 50;

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function actionBadgeColor(action: string) {
  if (action.startsWith("auth")) return "bg-purple-500/15 text-purple-300";
  if (action.startsWith("billing") || action.startsWith("invoice") || action.startsWith("estimate")) return "bg-emerald-500/15 text-emerald-300";
  if (action.startsWith("contract")) return "bg-amber-500/15 text-amber-300";
  if (action.startsWith("staff") || action.startsWith("role")) return "bg-sky-500/15 text-sky-300";
  if (action.includes("delete") || action.includes("deleted") || action.includes("void")) return "bg-red-500/15 text-red-300";
  return "bg-white/8 text-white/60";
}

function DiffViewer({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));

  if (allKeys.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-white/8 text-xs font-mono">
      <div className="flex text-white/40 bg-white/4 px-3 py-1.5">
        <span className="flex-1">Field</span>
        <span className="w-[40%] text-red-400/70">Before</span>
        <span className="w-[40%] text-emerald-400/70">After</span>
      </div>
      {allKeys.map((key) => {
        const bVal = before?.[key];
        const aVal = after?.[key];
        const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
        return (
          <div
            key={key}
            className={`flex px-3 py-1.5 border-t border-white/5 ${changed ? "bg-amber-500/5" : ""}`}
          >
            <span className="flex-1 text-white/50">{key}</span>
            <span className="w-[40%] text-red-300/80 truncate pr-2">
              {bVal === undefined ? "—" : JSON.stringify(bVal)}
            </span>
            <span className="w-[40%] text-emerald-300/80 truncate">
              {aVal === undefined ? "—" : JSON.stringify(aVal)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Filters
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Applied filters (committed on search)
  const [applied, setApplied] = useState({ userId: "", action: "", resourceType: "", from: "", to: "" });

  const fetchEvents = useCallback(async (filters: typeof applied, page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page) });
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.action) params.set("action", filters.action);
      if (filters.resourceType) params.set("resourceType", filters.resourceType);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(applied, offset);
  }, [applied, offset, fetchEvents]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = { userId, action, resourceType, from, to };
    setApplied(next);
    setOffset(0);
    setExpanded(new Set());
  }

  function handleClear() {
    setUserId(""); setAction(""); setResourceType(""); setFrom(""); setTo("");
    setApplied({ userId: "", action: "", resourceType: "", from: "", to: "" });
    setOffset(0);
    setExpanded(new Set());
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (applied.userId) params.set("userId", applied.userId);
      if (applied.action) params.set("action", applied.action);
      if (applied.resourceType) params.set("resourceType", applied.resourceType);
      if (applied.from) params.set("from", applied.from);
      if (applied.to) params.set("to", applied.to);

      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          <input
            type="text"
            placeholder="Action (e.g. contract.*)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          <input
            type="text"
            placeholder="Resource type"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-sky-500/50"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-sky-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </form>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-white/40">
        <span>
          {loading ? "Loading…" : `${total.toLocaleString()} event${total !== 1 ? "s" : ""}`}
          {total > 0 && !loading && ` — page ${currentPage} of ${totalPages}`}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-white/30 text-sm">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-white/30 text-sm">No events found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs">
                <th className="px-4 py-3 text-left font-medium w-8"></th>
                <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Resource</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Description</th>
                <th className="px-4 py-3 text-left font-medium hidden xl:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const isExpanded = expanded.has(ev._id);
                const hasDiff = ev.before !== null || ev.after !== null || ev.metadata !== null;
                return (
                  <>
                    <tr
                      key={ev._id}
                      className={`border-b border-white/5 hover:bg-white/2 transition-colors ${hasDiff ? "cursor-pointer" : ""}`}
                      onClick={() => hasDiff && toggleExpanded(ev._id)}
                    >
                      <td className="px-4 py-3 text-white/30">
                        {hasDiff && (
                          <svg
                            width="12" height="12"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            viewBox="0 0 24 24"
                            className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap font-mono text-xs">
                        {formatTs(ev.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white/80 font-medium truncate max-w-[120px]">{ev.userName}</div>
                        <div className="text-white/35 text-xs truncate max-w-[120px]">{ev.isOwner ? "Owner" : ev.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${actionBadgeColor(ev.action)}`}>
                          {ev.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white/70 text-xs">{ev.resourceType}</div>
                        {ev.resourceLabel && (
                          <div className="text-white/40 text-xs truncate max-w-[120px]">{ev.resourceLabel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs hidden lg:table-cell max-w-[200px] truncate">
                        {ev.description}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs hidden xl:table-cell font-mono">
                        {ev.ipAddress ?? "—"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${ev._id}-exp`} className="border-b border-white/5 bg-white/2">
                        <td colSpan={7} className="px-6 pb-4 pt-1">
                          <p className="text-xs text-white/40 mb-1">
                            <strong className="text-white/60">Description:</strong> {ev.description}
                          </p>
                          {ev.resourceId && (
                            <p className="text-xs text-white/40 mb-1">
                              <strong className="text-white/60">Resource ID:</strong>{" "}
                              <span className="font-mono">{ev.resourceId}</span>
                            </p>
                          )}
                          {(ev.before !== null || ev.after !== null) && (
                            <DiffViewer before={ev.before} after={ev.after} />
                          )}
                          {ev.metadata && (
                            <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/8">
                              <p className="text-xs text-white/40 mb-1 font-semibold">Metadata</p>
                              <pre className="text-xs text-white/50 overflow-x-auto">
                                {JSON.stringify(ev.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="text-white/40 text-xs">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
