"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "web-design": "Web Design",
  coaching: "Coaching",
  retainer: "Retainer",
  ecommerce: "E-Commerce",
  consulting: "Consulting",
};

type TemplateRecord = {
  _id: string;
  name: string;
  description: string | null;
  category: string;
  steps: Array<{ _key: string }>;
  _createdAt: string;
};

export default function TemplatesLibrary({ initialTemplates }: { initialTemplates: TemplateRecord[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/onboarding/templates/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete template");
      }
      setTemplates((prev) => prev.filter((template) => template._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-white/20 text-5xl mb-4">✓</div>
          <div className="text-white/40 text-sm mb-6">No templates yet. Create one to get started.</div>
          <Link
            href="/admin/onboarding/templates/new"
            className="inline-block px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template._id}
              className="bg-white/3 border border-white/8 rounded-xl p-5 hover:bg-white/5 hover:border-white/15 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/onboarding/templates/${template._id}`)}
                  className="text-left text-sm font-semibold text-white hover:text-sky-400 transition-colors"
                >
                  {template.name}
                </button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 flex-shrink-0">
                  {CATEGORY_LABELS[template.category] ?? template.category}
                </span>
              </div>
              {template.description && (
                <div className="text-xs text-white/40 mb-3 line-clamp-2">{template.description}</div>
              )}
              <div className="text-xs text-white/30">
                {(template.steps ?? []).length} step{(template.steps ?? []).length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-white/20 mt-1">
                Stored {new Date(template._createdAt).toLocaleDateString()}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/onboarding/templates/${template._id}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/onboarding/new?templateId=${template._id}`}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs transition-colors"
                >
                  Use Template
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(template._id, template.name)}
                  disabled={deletingId === template._id}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors disabled:opacity-50"
                >
                  {deletingId === template._id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
