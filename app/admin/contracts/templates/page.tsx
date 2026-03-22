import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContractTemplatesPage() {
  const templates = await sanityServer.fetch(
    `*[_type == "contractTemplate"] | order(_createdAt desc) {
      _id, name, category, variables, _createdAt
    }`
  ) as Array<{
    _id: string;
    name: string;
    category: string;
    variables: string[];
    _createdAt: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts</div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/contracts"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            All Contracts
          </Link>
          <Link
            href="/admin/contracts/templates/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            New Template
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-white/20 text-5xl mb-4">📄</div>
          <div className="text-white/40 text-sm mb-6">No templates yet. Create your first to get started.</div>
          <Link
            href="/admin/contracts/templates/new"
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
              href={`/admin/contracts/templates/${t._id}`}
              className="bg-white/3 border border-white/8 rounded-xl p-5 hover:bg-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-white group-hover:text-sky-400 transition-colors">
                  {t.name}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize flex-shrink-0">
                  {t.category?.replace(/-/g, " ") ?? "other"}
                </span>
              </div>
              <div className="text-xs text-white/30">
                {(t.variables ?? []).length} variable{(t.variables ?? []).length !== 1 ? "s" : ""}
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
