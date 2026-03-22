import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  "general": "General",
  "web-design": "Web Design",
  "coaching": "Coaching",
  "retainer": "Retainer",
  "ecommerce": "E-Commerce",
  "consulting": "Consulting",
};

export default async function OnboardingTemplatesPage() {
  const templates = await sanityServer.fetch(
    `*[_type == "onboardingTemplate"] | order(_createdAt desc) {
      _id, name, description, category, steps, _createdAt
    }`
  ) as Array<{
    _id: string;
    name: string;
    description: string | null;
    category: string;
    steps: Array<{ _key: string }>;
    _createdAt: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Onboarding</div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/onboarding"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Active Onboardings
          </Link>
          <Link
            href="/admin/onboarding/templates/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            New Template
          </Link>
        </div>
      </div>

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
          {templates.map((t) => (
            <Link
              key={t._id}
              href={`/admin/onboarding/templates/${t._id}`}
              className="bg-white/3 border border-white/8 rounded-xl p-5 hover:bg-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors">
                  {t.name}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 flex-shrink-0">
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </span>
              </div>
              {t.description && (
                <div className="text-xs text-white/40 mb-3 line-clamp-2">{t.description}</div>
              )}
              <div className="text-xs text-white/30">
                {(t.steps ?? []).length} step{(t.steps ?? []).length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-white/20 mt-1">
                {new Date(t._createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
