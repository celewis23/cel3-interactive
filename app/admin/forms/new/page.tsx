"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { slugify } from "@/lib/forms";

const INPUT = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors";
const LABEL = "block text-xs text-white/50 mb-1.5 tracking-wide uppercase";

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTitle(v: string) {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) { setError("Title and slug are required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create form");
      router.push(`/admin/forms/${data._id}/edit`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/forms" className="text-white/30 hover:text-white transition-colors">
          ← Forms
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-2xl font-semibold text-white">New Form</h1>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className={LABEL}>Form Title</label>
          <input
            value={title}
            onChange={e => handleTitle(e.target.value)}
            placeholder="e.g. Contact Us, Project Inquiry"
            className={INPUT}
            autoFocus
          />
        </div>

        <div>
          <label className={LABEL}>Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-sm shrink-0">/forms/</span>
            <input
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="form-slug"
              className={INPUT}
            />
          </div>
          {slug && (
            <p className="text-xs text-white/25 mt-1">Public URL: /forms/{slug}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
          >
            {saving ? "Creating…" : "Create & Edit"}
          </button>
          <Link
            href="/admin/forms"
            className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
