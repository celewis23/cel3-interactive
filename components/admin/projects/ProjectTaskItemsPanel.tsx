"use client";

import { useState } from "react";
import Link from "next/link";
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
  calendarEventLink: string | null;
};

function formatWhen(item: TaskItem) {
  if (item.kind === "task") {
    if (item.dueDate) return `Due ${DateTime.fromISO(item.dueDate).toFormat("MMM d, yyyy")}`;
    return null;
  }
  if (item.remindAt) {
    const dt = DateTime.fromISO(item.remindAt);
    return dt.isValid ? dt.toFormat("MMM d, h:mm a") : null;
  }
  return null;
}

export default function ProjectTaskItemsPanel({ projectId, initialItems }: { projectId: string; initialItems: TaskItem[] }) {
  const [items, setItems] = useState<TaskItem[]>(initialItems);

  async function handleToggle(item: TaskItem) {
    const res = await fetch(`/api/admin/tasks/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status === "completed" ? "open" : "completed" }),
    });
    if (!res.ok) return;
    const updated = await res.json() as TaskItem;
    setItems((prev) => prev.map((existing) => existing.id === updated.id ? updated : existing));
  }

  async function handleDelete(item: TaskItem) {
    const res = await fetch(`/api/admin/tasks/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((existing) => existing.id !== item.id));
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.22em] text-white/35">Tasks &amp; Reminders</div>
        <Link
          href={`/admin/tasks?newForProject=${projectId}`}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          + New
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-white/30">Nothing tied to this project yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 p-3">
              <button
                onClick={() => handleToggle(item)}
                className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border transition-colors ${
                  item.status === "completed"
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : "border-white/20 text-transparent hover:border-sky-400"
                }`}
                aria-label={item.status === "completed" ? "Mark open" : "Mark complete"}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm ${item.status === "completed" ? "text-white/40 line-through" : "text-white/85"}`}>
                    {item.title}
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                    item.kind === "task" ? "bg-sky-500/10 text-sky-300" : "bg-amber-500/10 text-amber-300"
                  }`}>
                    {item.kind}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/35">
                  {formatWhen(item) && <span>{formatWhen(item)}</span>}
                  {item.calendarEventLink && (
                    <a href={item.calendarEventLink} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 transition-colors">
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
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
