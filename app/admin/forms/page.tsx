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
        <div className="space-y-3">
          {list.map(f => (
            <div
              key={f._id}
              className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors"
            >
              {/* Info section — links to edit */}
              <Link href={`/admin/forms/${f._id}/edit`} className="block px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-white leading-snug">{f.title}</span>
                  {/* Status badges — top right */}
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {f.isPublic ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Public</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/30">Private</span>
                    )}
                    {!f.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Closed</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                  <span className="text-xs text-white/30">/forms/{f.slug}</span>
                  <span className="text-white/15 text-xs">·</span>
                  <span className="text-xs text-white/30">
                    {f.submissionCount} submission{f.submissionCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-white/15 text-xs">·</span>
                  <span className="text-xs text-white/20">{DateTime.fromISO(f._createdAt).toRelative()}</span>
                </div>
              </Link>

              {/* Action bar — full-width, mobile-friendly tap targets */}
              <div className="flex border-t border-white/6">
                <a
                  href={`/forms/${f.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/35 hover:text-white hover:bg-white/4 transition-colors"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  View
                </a>
                <div className="w-px bg-white/6" />
                <Link
                  href={`/admin/forms/${f._id}/submissions`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/35 hover:text-white hover:bg-white/4 transition-colors"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M3.75 3h16.5a.75.75 0 01.75.75v15a.75.75 0 01-.75.75H3.75A.75.75 0 013 18.75V3.75A.75.75 0 013.75 3z" />
                  </svg>
                  Submissions
                </Link>
                <div className="w-px bg-white/6" />
                <Link
                  href={`/admin/forms/${f._id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-400/5 transition-colors font-medium"
                >
                  Edit
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
