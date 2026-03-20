import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";
import { DateTime } from "luxon";

export const dynamic = "force-dynamic";

type FormListItem = {
  _id: string;
  title: string;
  slug: string;
  isPublic: boolean;
  isActive: boolean;
  _createdAt: string;
  submissionCount: number;
};

export default async function FormsListPage() {
  const [forms, subs] = await Promise.all([
    sanityServer.fetch<Omit<FormListItem, "submissionCount">[]>(
      `*[_type == "cel3Form"] | order(_createdAt desc){ _id, title, slug, isPublic, isActive, _createdAt }`
    ),
    sanityServer.fetch<{ formId: string }[]>(
      `*[_type == "cel3FormSubmission"]{ formId }`
    ),
  ]);

  const countMap: Record<string, number> = {};
  for (const s of subs) countMap[s.formId] = (countMap[s.formId] || 0) + 1;
  const list: FormListItem[] = forms.map(f => ({ ...f, submissionCount: countMap[f._id] || 0 }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">CEL3 Forms</h1>
          <p className="text-sm text-white/40 mt-1">
            {list.length} form{list.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/forms/new"
          className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
        >
          + New Form
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No forms yet.</p>
          <Link href="/admin/forms/new" className="text-sky-400 hover:text-sky-300 text-sm mt-2 inline-block">
            Create your first form →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(f => (
            <div
              key={f._id}
              className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{f.title}</span>
                  {f.isPublic ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Public</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/30">Private</span>
                  )}
                  {!f.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Closed</span>
                  )}
                </div>
                <div className="text-xs text-white/30 mt-0.5">
                  /forms/{f.slug} &middot; {f.submissionCount} submission{f.submissionCount !== 1 ? "s" : ""} &middot; {DateTime.fromISO(f._createdAt).toRelative()}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/forms/${f.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/30 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/20"
                >
                  View
                </a>
                <Link
                  href={`/admin/forms/${f._id}/submissions`}
                  className="text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/20"
                >
                  Submissions
                </Link>
                <Link
                  href={`/admin/forms/${f._id}/edit`}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/20"
                >
                  Edit
                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
