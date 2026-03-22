"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type PmColumn = { id: string; name: string; taskIds: string[] };
type PmProject = {
  _id: string;
  name: string;
  description: string;
  status: string;
  dueDate: string | null;
  columns: PmColumn[];
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ProjectSettingsForm({ project }: { project: PmProject }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    dueDate: project.dueDate ?? "",
  });
  const [columns, setColumns] = useState<PmColumn[]>(project.columns ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [newColName, setNewColName] = useState("");

  function moveCol(index: number, dir: -1 | 1) {
    const next = [...columns];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setColumns(next);
  }

  function addColumn() {
    if (!newColName.trim()) return;
    setColumns((cs) => [...cs, { id: genId(), name: newColName.trim(), taskIds: [] }]);
    setNewColName("");
  }

  function renameColumn(id: string, name: string) {
    setColumns((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function removeColumn(id: string) {
    const col = columns.find((c) => c.id === id);
    if (col && col.taskIds.length > 0) {
      if (!confirm(`"${col.name}" has ${col.taskIds.length} task(s). Delete column anyway? Tasks will be orphaned.`)) return;
    }
    setColumns((cs) => cs.filter((c) => c.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/pm/projects/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          status: form.status,
          dueDate: form.dueDate || null,
          columns,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.push(`/admin/projects/${project._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pm/projects/${project._id}`, { method: "DELETE" });
      router.push("/admin/projects");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* General */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">General</h2>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Project Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </section>

      {/* Columns */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Columns</h2>
        <p className="text-xs text-white/30">Drag to reorder, or use the arrows. Changes are saved with the form.</p>

        <div className="space-y-2">
          {columns.map((col, i) => (
            <div
              key={col.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveCol(i, -1)}
                  disabled={i === 0}
                  className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveCol(i, 1)}
                  disabled={i === columns.length - 1}
                  className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▼
                </button>
              </div>
              <input
                value={col.name}
                onChange={(e) => renameColumn(col.id, e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none border-b border-transparent focus:border-white/20 pb-0.5 transition-colors"
              />
              <span className="text-[11px] text-white/25">{col.taskIds.length} task{col.taskIds.length !== 1 ? "s" : ""}</span>
              <button
                onClick={() => removeColumn(col.id)}
                className="text-white/20 hover:text-red-400 transition-colors text-xs ml-1"
                title="Remove column"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
            placeholder="New column name…"
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
          <button
            onClick={addColumn}
            disabled={!newColName.trim()}
            className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/14 disabled:opacity-40 text-white text-sm transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-400/60 hover:text-red-400 transition-colors"
        >
          {deleting ? "Deleting…" : "Delete project"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
