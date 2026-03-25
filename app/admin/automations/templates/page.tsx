"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  nodes: unknown[];
  tags: string[];
}

// ── Category colors ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Clients:   "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Billing:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Pipeline:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Projects:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Contracts: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Bookings:  "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const CATEGORY_ICONS: Record<string, string> = {
  Clients:   "👤",
  Billing:   "💳",
  Pipeline:  "📊",
  Projects:  "📋",
  Contracts: "📝",
  Bookings:  "📅",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetch("/api/admin/automations/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = activeCategory === "All" ? templates : templates.filter((t) => t.category === activeCategory);

  const useTemplate = async (template: Template) => {
    setCreating(template.id);
    try {
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          triggerType: template.triggerType,
          nodes: { nodes: template.nodes },
          templateId: template.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data._id) {
        router.push(`/admin/automations/${data._id}/builder`);
      }
    } catch {
      // silent
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/admin/automations")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Automations
          </button>
          <h1 className="text-xl font-bold text-white">Automation Templates</h1>
          <p className="text-sm text-white/40 mt-1">Start from a pre-built workflow and customise it for your needs.</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-sky-500 text-black"
                : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white/70"
            }`}
          >
            {cat !== "All" && CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ""}{cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading templates…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const colorClass = CATEGORY_COLORS[template.category] ?? "bg-white/5 text-white/60 border-white/10";
            const isBusy = creating === template.id;
            return (
              <div
                key={template.id}
                className="bg-white/3 border border-white/8 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/15 transition-colors"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorClass} mb-2`}>
                      {CATEGORY_ICONS[template.category] ?? ""} {template.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white leading-snug">{template.name}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/45 leading-relaxed flex-1">{template.description}</p>

                {/* Meta */}
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <span>{template.triggerType.replace(/_/g, " ")}</span>
                  <span className="ml-auto">{template.nodes.length} steps</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/35">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => useTemplate(template)}
                  disabled={isBusy}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-sm font-semibold transition-colors"
                >
                  {isBusy ? "Creating…" : "Use this template"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
