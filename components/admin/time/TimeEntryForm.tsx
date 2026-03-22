"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TimeEntry {
  _id?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  description?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  taskId?: string | null;
  taskTitle?: string | null;
  clientName?: string | null;
  pipelineContactId?: string | null;
  stripeCustomerId?: string | null;
  billable?: boolean;
  hourlyRate?: number;
}

interface Project {
  _id: string;
  name: string;
  clientRef?: string;
}

interface Props {
  initial?: TimeEntry;
  onSaved?: (entry: TimeEntry) => void;
  onCancel?: () => void;
}

function toTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // e.g. "2026-03-22T09:30:00.000Z" → "09:30"
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildIsoFromDateAndTime(date: string, time: string): string {
  // Combine date "2026-03-22" + time "09:30" into ISO string (local)
  if (!date || !time) return "";
  return new Date(`${date}T${time}:00`).toISOString();
}

function secondsFromTimes(date: string, start: string, end: string): number {
  if (!date || !start || !end) return 0;
  const s = new Date(`${date}T${start}:00`).getTime();
  const e = new Date(`${date}T${end}:00`).getTime();
  return Math.max(0, Math.round((e - s) / 1000));
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimeEntryForm({ initial, onSaved, onCancel }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const defaultRate = typeof window !== "undefined" ? localStorage.getItem("time_default_rate") ?? "150" : "150";

  const [date, setDate] = useState(initial?.date ?? today);
  const [startTimeInput, setStartTimeInput] = useState(toTimeInput(initial?.startTime) || "");
  const [endTimeInput, setEndTimeInput] = useState(toTimeInput(initial?.endTime) || "");
  const [durationInput, setDurationInput] = useState(
    initial?.durationSeconds ? formatDuration(initial.durationSeconds) : ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [projectName, setProjectName] = useState(initial?.projectName ?? "");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [billable, setBillable] = useState(initial?.billable !== false);
  const [rate, setRate] = useState(String(initial?.hourlyRate ?? defaultRate));

  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/pm/projects")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Auto-compute duration when start/end change
  useEffect(() => {
    if (startTimeInput && endTimeInput && date) {
      const secs = secondsFromTimes(date, startTimeInput, endTimeInput);
      if (secs > 0) setDurationInput(formatDuration(secs));
    }
  }, [date, startTimeInput, endTimeInput]);

  // Persist default rate
  useEffect(() => {
    if (typeof window !== "undefined" && rate) {
      localStorage.setItem("time_default_rate", rate);
    }
  }, [rate]);

  function parseDurationInput(input: string): number {
    // Accept: "1h 30m", "1.5h", "1h", "90m", "5400" (seconds)
    const trimmed = input.trim().toLowerCase();
    const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
    const minsMatch = trimmed.match(/(\d+)\s*m/);
    if (hoursMatch || minsMatch) {
      const h = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
      const m = minsMatch ? parseInt(minsMatch[1]) : 0;
      return Math.round(h * 3600 + m * 60);
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num > 0) return Math.round(num * 3600); // treat as hours
    return 0;
  }

  async function handleSave() {
    setError(null);
    if (!date) { setError("Date is required."); return; }

    let durationSeconds = 0;
    let startIso: string | null = null;
    let endIso: string | null = null;

    if (startTimeInput && endTimeInput) {
      startIso = buildIsoFromDateAndTime(date, startTimeInput);
      endIso = buildIsoFromDateAndTime(date, endTimeInput);
      durationSeconds = secondsFromTimes(date, startTimeInput, endTimeInput);
    } else if (durationInput) {
      durationSeconds = parseDurationInput(durationInput);
      startIso = startTimeInput ? buildIsoFromDateAndTime(date, startTimeInput) : null;
      endIso = startIso && durationSeconds
        ? new Date(new Date(startIso).getTime() + durationSeconds * 1000).toISOString()
        : null;
    }

    if (!durationSeconds && !startTimeInput) {
      setError("Enter start/end times or a duration.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        startTime: startIso,
        endTime: endIso,
        durationSeconds,
        description: description.trim() || null,
        projectId: projectId || null,
        projectName: projectName || null,
        clientName: clientName.trim() || null,
        billable,
        hourlyRate: parseFloat(rate) || 0,
      };

      const url = initial?._id ? `/api/admin/time/entries/${initial._id}` : "/api/admin/time/entries";
      const method = initial?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save.");
        return;
      }

      const saved = await res.json();
      if (onSaved) {
        onSaved(saved);
      } else {
        router.push("/admin/time");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Start Time</label>
          <input
            type="time"
            value={startTimeInput}
            onChange={(e) => setStartTimeInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">End Time</label>
          <input
            type="time"
            value={endTimeInput}
            onChange={(e) => setEndTimeInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
          />
        </div>
      </div>

      {/* Duration (manual override) */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Duration — e.g. &ldquo;1h 30m&rdquo;, &ldquo;1.5h&rdquo;, &ldquo;90m&rdquo;
        </label>
        <input
          type="text"
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          placeholder="1h 30m"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
        />
      </div>

      {/* Project + Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Project</label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setProjectName(projects.find((p) => p._id === e.target.value)?.name ?? "");
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
          >
            <option value="" className="bg-[#0f0f0f]">No project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id} className="bg-[#0f0f0f]">{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Client</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
      </div>

      {/* Billable + Rate */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2.5 text-sm text-white/60 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 text-sky-500 focus:ring-sky-500"
          />
          Billable
        </label>
        {billable && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>$</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="0"
              step="0.01"
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-sky-400/50"
            />
            <span>/ hr</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving…" : initial?._id ? "Save Changes" : "Add Entry"}
        </button>
        <button
          type="button"
          onClick={onCancel ?? (() => router.back())}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
