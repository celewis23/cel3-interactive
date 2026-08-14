"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";

type TaskKind = "task" | "reminder";
type TaskStatus = "open" | "completed";

type TaskItem = {
  id: string;
  kind: TaskKind;
  title: string;
  notes: string | null;
  status: TaskStatus;
  dueDate: string | null;
  notifyTime: string | null;
  remindAt: string | null;
  keepUntilCleared: boolean;
  completedAt: string | null;
  createdAt: string;
  projectId: string | null;
  calendarEventLink: string | null;
};

type Project = { _id: string; name: string };

type RemindMode = "at" | "in";

type NewItemForm = {
  kind: TaskKind;
  title: string;
  notes: string;
  dueDate: string;
  notifyTime: string;
  remindMode: RemindMode;
  remindAtLocal: string;
  remindInMinutes: string;
  keepUntilCleared: boolean;
  projectId: string;
  addToCalendar: boolean;
};

const DEFAULT_FORM: NewItemForm = {
  kind: "task",
  title: "",
  notes: "",
  dueDate: "",
  notifyTime: "09:00",
  remindMode: "in",
  remindAtLocal: "",
  remindInMinutes: "30",
  keepUntilCleared: true,
  projectId: "",
  addToCalendar: true,
};

function formatNotifyTime(hhmm: string | null) {
  if (!hhmm) return null;
  const dt = DateTime.fromFormat(hhmm, "HH:mm");
  return dt.isValid ? dt.toFormat("h:mm a") : hhmm;
}

function formatRemindAt(iso: string | null) {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toFormat("MMM d, h:mm a") : null;
}

export default function TasksClient() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("open");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<NewItemForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/tasks");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load tasks");
        }
        setItems(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    fetch("/api/admin/pm/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const projectId = searchParams.get("newForProject");
    if (projectId) {
      setForm((prev) => ({ ...prev, projectId }));
      setShowNew(true);
    }
  }, [searchParams]);

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p._id, p.name])),
    [projects]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "open" && item.status !== "open") return false;
      if (statusFilter === "done" && item.status !== "completed") return false;
      if (query && !item.title.toLowerCase().includes(query) && !(item.notes ?? "").toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, statusFilter, search]);

  const grouped = useMemo(() => ({
    open: filtered.filter((item) => item.status === "open"),
    done: filtered.filter((item) => item.status === "completed"),
  }), [filtered]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const remindAt = form.kind === "reminder"
        ? form.remindMode === "in"
          ? DateTime.now().plus({ minutes: Number(form.remindInMinutes) || 0 }).toISO()
          : form.remindAtLocal
            ? DateTime.fromISO(form.remindAtLocal).toISO()
            : null
        : null;

      if (form.kind === "reminder" && !remindAt) {
        throw new Error("Set a reminder time");
      }

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          title: form.title.trim(),
          notes: form.notes.trim() || undefined,
          dueDate: form.kind === "task" ? (form.dueDate || undefined) : undefined,
          notifyTime: form.kind === "task" ? form.notifyTime : undefined,
          remindAt: remindAt ?? undefined,
          keepUntilCleared: form.keepUntilCleared,
          projectId: form.projectId || undefined,
          addToCalendar: form.addToCalendar,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create item");
      }
      const created = await res.json() as TaskItem;
      setItems((prev) => [created, ...prev]);
      setForm(DEFAULT_FORM);
      setShowNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: TaskItem) {
    try {
      const res = await fetch(`/api/admin/tasks/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: item.status === "completed" ? "open" : "completed" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update item");
      }
      const updated = await res.json() as TaskItem;
      setItems((prev) => prev.map((existing) => existing.id === updated.id ? updated : existing));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  }

  async function handleDelete(item: TaskItem) {
    try {
      const res = await fetch(`/api/admin/tasks/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete item");
      }
      setItems((prev) => prev.filter((existing) => existing.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks &amp; Reminders</h1>
          <p className="text-sm text-white/40 mt-1">Both push a notification to your devices when they&apos;re due.</p>
        </div>
        <button
          onClick={() => setShowNew((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          {showNew && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
              <div className="flex rounded-xl border border-white/10 overflow-hidden">
                {(["task", "reminder"] as TaskKind[]).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setForm((prev) => ({ ...prev, kind }))}
                    className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${
                      form.kind === kind ? "bg-sky-500/15 text-sky-300" : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={form.kind === "task" ? "Task title" : "Reminder title"}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/40"
              />
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes (shown in the notification)"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/40 resize-none"
              />

              <div>
                <label className="mb-1.5 block text-xs text-white/45">Project (optional)</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {form.kind === "task" ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs text-white/45">Due date (optional)</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-white/45">Push daily at</label>
                    <input
                      type="time"
                      value={form.notifyTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, notifyTime: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
                    />
                    <p className="mt-1 text-[11px] text-white/30">Repeats every day at this time until the task is completed.</p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {([{ id: "in", label: "In..." }, { id: "at", label: "At a time" }] as { id: RemindMode; label: string }[]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setForm((prev) => ({ ...prev, remindMode: opt.id }))}
                        className={`flex-1 px-3 py-2 text-sm transition-colors ${
                          form.remindMode === opt.id ? "bg-sky-500/15 text-sky-300" : "text-white/50 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.remindMode === "in" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={form.remindInMinutes}
                        onChange={(e) => setForm((prev) => ({ ...prev, remindInMinutes: e.target.value }))}
                        className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
                      />
                      <span className="text-sm text-white/50">minutes from now</span>
                    </div>
                  ) : (
                    <input
                      type="datetime-local"
                      value={form.remindAtLocal}
                      onChange={(e) => setForm((prev) => ({ ...prev, remindAtLocal: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
                    />
                  )}
                </div>
              )}

              <label className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/2 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.addToCalendar}
                  onChange={(e) => setForm((prev) => ({ ...prev, addToCalendar: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-0"
                />
                <span className="text-xs text-white/55">
                  Add to Google Calendar — creates a matching event on your primary calendar and keeps it in sync.
                </span>
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/2 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.keepUntilCleared}
                  onChange={(e) => setForm((prev) => ({ ...prev, keepUntilCleared: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-0"
                />
                <span className="text-xs text-white/55">
                  Keep until cleared — the notification stays on screen until dismissed
                  {form.kind === "reminder" ? ", and the reminder stays in this list until you clear it." : "."}
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowNew(false); setForm(DEFAULT_FORM); }}
                  className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 hover:bg-white/8 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.title.trim()}
                  className="flex-1 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/40"
              />
              <div className="flex rounded-xl border border-white/10 overflow-hidden">
                {[
                  { id: "open", label: "Open" },
                  { id: "all", label: "All" },
                  { id: "done", label: "Done" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setStatusFilter(option.id as "all" | "open" | "done")}
                    className={`px-3 py-2 text-sm transition-colors ${
                      statusFilter === option.id ? "bg-sky-500/15 text-sky-300" : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-2">
            {[
              { title: "Open", items: grouped.open },
              { title: "Completed", items: grouped.done },
            ].map((section, idx) => (
              <div key={section.title} className={idx === 0 ? "border-b border-white/8 xl:border-b-0 xl:border-r xl:border-white/8" : ""}>
                <div className="px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/35">{section.title}</div>
                {loading ? (
                  <div className="space-y-3 px-4 pb-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : section.items.length === 0 ? (
                  <div className="px-4 pb-5 text-sm text-white/30">No {section.title.toLowerCase()} items.</div>
                ) : (
                  <div className="space-y-3 px-4 pb-4">
                    {section.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggle(item)}
                            className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border transition-colors ${
                              item.status === "completed"
                                ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                                : "border-white/20 text-transparent hover:border-sky-400"
                            }`}
                            aria-label={item.status === "completed" ? "Mark open" : "Mark complete"}
                          >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${item.status === "completed" ? "text-white/45 line-through" : "text-white"}`}>
                                {item.title}
                              </span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                item.kind === "task" ? "bg-sky-500/10 text-sky-300" : "bg-amber-500/10 text-amber-300"
                              }`}>
                                {item.kind}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="mt-1 text-sm text-white/45 whitespace-pre-wrap">{item.notes}</p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-white/35 flex-wrap">
                              {item.kind === "task" ? (
                                <>
                                  {item.notifyTime && <span>Daily at {formatNotifyTime(item.notifyTime)}</span>}
                                  {item.dueDate && <span>Due {DateTime.fromISO(item.dueDate).toFormat("MMM d, yyyy")}</span>}
                                </>
                              ) : (
                                item.remindAt && <span>{formatRemindAt(item.remindAt)}</span>
                              )}
                              {item.completedAt && <span>Completed {DateTime.fromISO(item.completedAt).toRelative() ?? "recently"}</span>}
                              {item.projectId && projectName[item.projectId] && (
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/45">{projectName[item.projectId]}</span>
                              )}
                              {item.calendarEventLink && (
                                <a
                                  href={item.calendarEventLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-400 hover:text-sky-300 transition-colors"
                                >
                                  Calendar ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-white/25 hover:text-red-400 transition-colors"
                            aria-label="Delete"
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
