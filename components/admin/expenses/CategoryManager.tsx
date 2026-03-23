"use client";

import { useState } from "react";
import type { ExpenseCategory } from "./ExpenseForm";

interface Props {
  categories: ExpenseCategory[];
  onChange: (cats: ExpenseCategory[]) => void;
}

const PRESET_COLORS = [
  "#ef4444","#f97316","#f59e0b","#84cc16","#10b981","#06b6d4",
  "#3b82f6","#6366f1","#8b5cf6","#ec4899","#6b7280","#14b8a6",
];

export default function CategoryManager({ categories, onChange }: Props) {
  const [newName,     setNewName]     = useState("");
  const [newColor,    setNewColor]    = useState("#6366f1");
  const [newTax,      setNewTax]      = useState(false);
  const [adding,      setAdding]      = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [editName,    setEditName]    = useState("");
  const [editColor,   setEditColor]   = useState("");
  const [editTax,     setEditTax]     = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, taxRelevant: newTax }),
      });
      if (!r.ok) throw new Error();
      const cat = await r.json() as ExpenseCategory;
      onChange([...categories, cat]);
      setNewName(""); setNewColor("#6366f1"); setNewTax(false); setAdding(false);
    } catch { alert("Failed to add category."); }
    finally { setSaving(false); }
  }

  function startEdit(cat: ExpenseCategory) {
    setEditId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditTax(cat.taxRelevant);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/expenses/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor, taxRelevant: editTax }),
      });
      if (!r.ok) throw new Error();
      onChange(categories.map((c) => c._id === id ? { ...c, name: editName.trim(), color: editColor, taxRelevant: editTax } : c));
      setEditId(null);
    } catch { alert("Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Expenses in this category will become uncategorized.`)) return;
    try {
      await fetch(`/api/admin/expenses/categories/${id}`, { method: "DELETE" });
      onChange(categories.filter((c) => c._id !== id));
    } catch { alert("Failed to delete category."); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setAdding(!adding)}
          className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">
          + Add Category
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">New Category</h3>
          <div>
            <label className="block text-xs text-white/40 mb-1">Name</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${newColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setNewTax(!newTax)}
              className={`w-8 h-4 rounded-full transition-colors ${newTax ? "bg-sky-500" : "bg-white/15"}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.25 transition-transform ${newTax ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-white/60">Tax relevant</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewName(""); }}
              className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !newName.trim()}
              className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black text-sm font-semibold transition-colors">
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        {categories.length === 0 ? (
          <div className="px-5 py-8 text-center text-white/25 text-sm">No categories yet</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {categories.map((cat) => (
              <li key={cat._id} className="px-4 py-3">
                {editId === cat._id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500/50" />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${editColor === c ? "border-white scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setEditTax(!editTax)}
                        className={`w-8 h-4 rounded-full transition-colors ${editTax ? "bg-sky-500" : "bg-white/15"}`}>
                        <div className={`w-3.5 h-3.5 rounded-full bg-white mt-0.25 transition-transform ${editTax ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs text-white/50">Tax relevant</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white transition-colors">Cancel</button>
                      <button onClick={() => handleSaveEdit(cat._id)} disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/30 transition-colors disabled:opacity-40">
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm text-white/80">{cat.name}</span>
                    {cat.taxRelevant && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Tax</span>}
                    {cat.isDefault && <span className="text-[10px] text-white/20">default</span>}
                    <button onClick={() => startEdit(cat)} className="p-1 rounded text-white/20 hover:text-white/60 transition-colors">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931" />
                      </svg>
                    </button>
                    {!cat.isDefault && (
                      <button onClick={() => handleDelete(cat._id, cat.name)} className="p-1 rounded text-white/20 hover:text-red-400 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
