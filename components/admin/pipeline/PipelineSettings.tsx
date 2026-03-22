"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Stage = { id: string; name: string };

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function PipelineSettings({ initialStages }: { initialStages: Stage[] }) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [newStageName, setNewStageName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function moveStage(index: number, dir: -1 | 1) {
    const next = [...stages];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setStages(next);
  }

  function renameStage(id: string, name: string) {
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function addStage() {
    if (!newStageName.trim()) return;
    setStages((ss) => [...ss, { id: genId(), name: newStageName.trim() }]);
    setNewStageName("");
  }

  function removeStage(id: string) {
    const stage = stages.find((s) => s.id === id);
    if (!confirm(`Remove stage "${stage?.name}"? Any contacts in this stage will need to be manually moved.`)) return;
    setStages((ss) => ss.filter((s) => s.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pipeline/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Stages</h2>
        <p className="text-xs text-white/30">Use the arrows to reorder. Changes take effect after saving.</p>

        <div className="space-y-2">
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/8"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStage(i, -1)}
                  disabled={i === 0}
                  className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveStage(i, 1)}
                  disabled={i === stages.length - 1}
                  className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▼
                </button>
              </div>
              <input
                value={stage.name}
                onChange={(e) => renameStage(stage.id, e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none border-b border-transparent focus:border-white/20 pb-0.5 transition-colors"
              />
              <span className="text-[11px] text-white/20 font-mono">{stage.id}</span>
              <button
                onClick={() => removeStage(stage.id)}
                className="text-white/20 hover:text-red-400 transition-colors text-xs ml-1"
                title="Remove stage"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStage()}
            placeholder="New stage name…"
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
          <button
            onClick={addStage}
            disabled={!newStageName.trim()}
            className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/14 disabled:opacity-40 text-white text-sm transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t border-white/8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
