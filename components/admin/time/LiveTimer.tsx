"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ActiveTimer {
  _id: string;
  startTime: string;
  description: string | null;
  projectName: string | null;
  clientName: string | null;
  billable: boolean;
  hourlyRate: number;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function LiveTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Start form state
  const [desc, setDesc] = useState("");
  const [project, setProject] = useState("");
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [billable, setBillable] = useState(true);
  const [rate, setRate] = useState("150");
  const [projects, setProjects] = useState<{ _id: string; name: string; clientRef?: string }[]>([]);

  // Load active timer on mount
  useEffect(() => {
    fetch("/api/admin/time/active")
      .then((r) => r.json())
      .then((d) => {
        if (d && d._id) {
          setActive(d);
          const seconds = Math.floor(
            (Date.now() - new Date(d.startTime).getTime()) / 1000
          );
          setElapsed(Math.max(0, seconds));
        }
      })
      .catch(() => {});
  }, []);

  // Tick
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  // Close popover on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Load projects for selector
  useEffect(() => {
    if (!open || active) return;
    fetch("/api/admin/pm/projects?status=active")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [open, active]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch("/api/admin/time/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: now,
          date: now.slice(0, 10),
          description: desc.trim() || null,
          projectId: project || null,
          projectName: projectName || null,
          clientName: client.trim() || null,
          billable,
          hourlyRate: parseFloat(rate) || 0,
        }),
      });
      if (res.ok) {
        const entry = await res.json();
        setActive(entry);
        setElapsed(0);
        setOpen(false);
        setDesc("");
        setProject("");
        setClient("");
      }
    } finally {
      setLoading(false);
    }
  }, [desc, project, projectName, client, billable, rate]);

  const handleStop = useCallback(async () => {
    if (!active) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/admin/time/entries/${active._id}/stop`, { method: "POST" });
      if (res.ok) {
        setActive(null);
        setElapsed(0);
      }
    } finally {
      setStopping(false);
    }
  }, [active]);

  return (
    <div className="relative px-3 py-3" ref={popoverRef}>
      {active ? (
        /* Running state */
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono text-sky-400 leading-none">{formatElapsed(elapsed)}</div>
              {(active.description || active.projectName) && (
                <div className="text-xs text-white/30 truncate mt-0.5 leading-none">
                  {active.description || active.projectName}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleStop}
            disabled={stopping}
            title="Stop timer"
            className="flex-shrink-0 w-6 h-6 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors"
          >
            <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
        </div>
      ) : (
        /* Idle state */
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
            open
              ? "bg-sky-500/10 text-sky-400"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          <span>Start Timer</span>
        </button>
      )}

      {/* Popover for starting a timer */}
      {open && !active && (
        <div className="absolute bottom-full left-3 mb-2 w-72 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-4 z-50 space-y-3">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Start Timer</div>

          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
            placeholder="What are you working on?"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />

          {projects.length > 0 && (
            <select
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setProjectName(projects.find((p) => p._id === e.target.value)?.name ?? "");
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
            >
              <option value="" className="bg-[#1a1a1a]">No project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id} className="bg-[#1a1a1a]">{p.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client (optional)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
            />
            <div className="flex items-center gap-1 text-xs text-white/50">
              <span>$</span>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50"
              />
              <span>/hr</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/30 text-sky-500"
              />
              Billable
            </label>
            <button
              onClick={handleStart}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? "…" : "Start"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
