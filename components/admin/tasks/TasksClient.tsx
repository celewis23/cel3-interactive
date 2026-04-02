"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

type GoogleTaskList = {
  id: string;
  title: string;
  updated?: string;
};

type GoogleTask = {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
  taskListId: string;
};

type NewTaskForm = {
  title: string;
  notes: string;
  due: string;
};

function formatDue(value?: string) {
  if (!value) return "No due date";
  return DateTime.fromISO(value).toLocal().toFormat("MMM d, yyyy");
}

export default function TasksClient() {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("open");
  const [search, setSearch] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>({ title: "", notes: "", due: "" });
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTaskLists() {
      setLoadingLists(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/tasks/tasklists");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load Google Tasks");
        }
        const data = await res.json() as GoogleTaskList[];
        setTaskLists(data);
        if (data[0]?.id) setSelectedTaskListId((prev) => prev || data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task lists");
      } finally {
        setLoadingLists(false);
      }
    }

    loadTaskLists();
  }, []);

  useEffect(() => {
    if (!selectedTaskListId) return;

    async function loadTasks() {
      setLoadingTasks(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          taskListId: selectedTaskListId,
          status: statusFilter,
        });
        if (search.trim()) params.set("q", search.trim());
        const res = await fetch(`/api/admin/tasks?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load tasks");
        }
        const data = await res.json() as GoogleTask[];
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoadingTasks(false);
      }
    }

    loadTasks();
  }, [selectedTaskListId, statusFilter, search]);

  const grouped = useMemo(() => ({
    open: tasks.filter((task) => task.status !== "completed"),
    done: tasks.filter((task) => task.status === "completed"),
  }), [tasks]);

  async function handleCreateTask() {
    if (!selectedTaskListId || !newTaskForm.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskListId: selectedTaskListId,
          title: newTaskForm.title.trim(),
          notes: newTaskForm.notes.trim() || undefined,
          due: newTaskForm.due || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create task");
      }
      const created = await res.json() as GoogleTask;
      setTasks((prev) => [created, ...prev]);
      setNewTaskForm({ title: "", notes: "", due: "" });
      setShowNewTask(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTask(task: GoogleTask) {
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}?taskListId=${encodeURIComponent(task.taskListId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: task.status === "completed" ? "needsAction" : "completed",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update task");
      }
      const updated = await res.json() as GoogleTask;
      setTasks((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleDeleteTask(task: GoogleTask) {
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}?taskListId=${encodeURIComponent(task.taskListId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete task");
      }
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-sm text-white/40 mt-1">Google Tasks, available right inside your backoffice.</p>
        </div>
        <button
          onClick={() => setShowNewTask((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Task
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-white/35 mb-3">Task Lists</div>
            {loadingLists ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : taskLists.length === 0 ? (
              <p className="text-sm text-white/30">No Google task lists found.</p>
            ) : (
              <div className="space-y-2">
                {taskLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedTaskListId(list.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selectedTaskListId === list.id
                        ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                        : "border-white/8 bg-white/4 text-white/70 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{list.title}</div>
                    {list.updated && (
                      <div className="text-[11px] mt-1 opacity-70">
                        Updated {DateTime.fromISO(list.updated).toRelative() ?? "recently"}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showNewTask && (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-white/35">Create Task</div>
              <input
                type="text"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/40"
              />
              <textarea
                value={newTaskForm.notes}
                onChange={(e) => setNewTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/40 resize-none"
              />
              <input
                type="date"
                value={newTaskForm.due}
                onChange={(e) => setNewTaskForm((prev) => ({ ...prev, due: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 hover:bg-white/8 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={saving || !newTaskForm.title.trim() || !selectedTaskListId}
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
                placeholder="Search tasks..."
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
            <div className="text-xs text-white/35">
              {taskLists.find((list) => list.id === selectedTaskListId)?.title ?? "Select a task list"}
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-2">
            {[
              { title: "Open", items: grouped.open },
              { title: "Completed", items: grouped.done },
            ].map((section, idx) => (
              <div key={section.title} className={idx === 0 ? "border-b border-white/8 xl:border-b-0 xl:border-r xl:border-white/8" : ""}>
                <div className="px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/35">{section.title}</div>
                {loadingTasks ? (
                  <div className="space-y-3 px-4 pb-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : section.items.length === 0 ? (
                  <div className="px-4 pb-5 text-sm text-white/30">No {section.title.toLowerCase()} tasks.</div>
                ) : (
                  <div className="space-y-3 px-4 pb-4">
                    {section.items.map((task) => (
                      <div key={task.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border transition-colors ${
                              task.status === "completed"
                                ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                                : "border-white/20 text-transparent hover:border-sky-400"
                            }`}
                            aria-label={task.status === "completed" ? "Mark incomplete" : "Mark complete"}
                          >
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-medium ${task.status === "completed" ? "text-white/45 line-through" : "text-white"}`}>
                              {task.title}
                            </div>
                            {task.notes && (
                              <p className="mt-1 text-sm text-white/45 whitespace-pre-wrap">{task.notes}</p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-xs text-white/35 flex-wrap">
                              <span>{formatDue(task.due)}</span>
                              {task.completed && <span>Completed {DateTime.fromISO(task.completed).toRelative() ?? "recently"}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="text-white/25 hover:text-red-400 transition-colors"
                            aria-label="Delete task"
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
