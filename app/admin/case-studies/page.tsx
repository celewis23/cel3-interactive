import Link from "next/link";
import { sanityServer } from "@/lib/sanityServer";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import imageUrlBuilder from "@sanity/image-url";
import { createClient } from "next-sanity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  useCdn: false,
});
const builder = imageUrlBuilder(client);

type Project = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  featured?: boolean;
  client?: string;
  industry?: string;
  heroImage?: unknown;
  _createdAt: string;
};

export default async function CaseStudiesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const projects = await sanityServer.fetch<Project[]>(`
    *[_type == "project"] | order(featured desc, _createdAt desc) {
      _id, title, "slug": slug.current, summary, featured, client, industry, heroImage, _createdAt
    }
  `);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Case Studies</h1>
          <p className="text-sm text-white/40 mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/case-studies/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Case Study
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No case studies yet.</p>
          <Link href="/admin/case-studies/new" className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300">
            Create your first one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => {
            const imgUrl = p.heroImage
              ? builder.image(p.heroImage as Parameters<typeof builder.image>[0]).width(80).height(60).fit("crop").url()
              : null;

            return (
              <Link
                key={p._id}
                href={`/admin/case-studies/${p._id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-white/8 hover:border-white/20 bg-white/2 hover:bg-white/5 transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/15">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors truncate">
                      {p.title}
                    </span>
                    {p.featured && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/35 mt-0.5 truncate">
                    {[p.client, p.industry].filter(Boolean).join(" · ")} {p.client || p.industry ? "·" : ""} /{p.slug}
                  </div>
                </div>

                {/* Arrow */}
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
