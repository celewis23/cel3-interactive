"use client";

import { useEffect, useRef, useState } from "react";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  html: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  /** Current raw HTML in the editor, offered when saving a new template. */
  value: string;
  /** Called with a template's HTML when the user picks "Use". */
  onApply: (html: string) => void;
  disabled?: boolean;
}

export default function EmailTemplatesMenu({ value, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function loadTemplates() {
    setLoading(true);
    setError("");
    fetch("/api/admin/email-templates")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load templates"))))
      .then((data: { templates?: EmailTemplate[] }) => setTemplates(data.templates ?? []))
      .catch(() => setError("Could not load templates."))
      .finally(() => setLoading(false));
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    setShowSaveForm(false);
    if (next) loadTemplates();
  }

  async function saveCurrentAsTemplate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, html: value }),
      });
      if (!res.ok) throw new Error();
      const { template } = await res.json();
      setTemplates((prev) => [template, ...prev]);
      setNewName("");
      setShowSaveForm(false);
    } catch {
      setError("Could not save template.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Could not delete template.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
        disabled={disabled}
        title="Email templates"
        className={`flex items-center gap-1.5 rounded-lg border border-white/10 bg-black px-2.5 py-1 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50 ${open ? "border-sky-400/50 text-white" : ""}`}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
        </svg>
        Templates
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[280px] rounded-xl border border-white/10 bg-black p-2 shadow-xl">
          {error && <p className="px-1 pb-2 text-xs text-red-300">{error}</p>}

          {loading ? (
            <p className="px-1 py-2 text-xs text-white/40">Loading…</p>
          ) : templates.length === 0 ? (
            <p className="px-1 py-2 text-xs text-white/40">No saved templates yet.</p>
          ) : (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id} className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-white/5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onApply(t.html);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-xs text-white/80 hover:text-white"
                    title={t.description || t.name}
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => deleteTemplate(t.id)}
                    disabled={deletingId === t.id}
                    className="shrink-0 rounded px-1 text-xs text-white/25 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete template"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 border-t border-white/8 pt-2">
            {showSaveForm ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void saveCurrentAsTemplate(); }
                    if (e.key === "Escape") setShowSaveForm(false);
                  }}
                  placeholder="Template name"
                  className="flex-1 rounded-lg border border-white/10 bg-[#090b10] px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-sky-400/50"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={saveCurrentAsTemplate}
                  disabled={saving || !newName.trim()}
                  className="rounded-lg bg-sky-500 px-2 py-1 text-xs text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowSaveForm(true)}
                className="w-full rounded-lg px-1.5 py-1 text-left text-xs text-sky-200 transition-colors hover:text-white"
              >
                + Save current as template
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
