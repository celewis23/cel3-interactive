import Link from "next/link";
import { sanityClient } from "@/lib/sanity.client";
import { urlFor } from "@/lib/sanity.image";
import { allWorkQuery, featuredWorkQuery } from "@/lib/sanity.queries";

type Item = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  heroImage?: any;
  featured?: boolean;
};

export const revalidate = 60;

function Card({ p }: { p: Item }) {
  const img = p.heroImage
    ? urlFor(p.heroImage).width(1400).height(900).fit("crop").url()
    : null;

  return (
    <Link
      href={`/work/${p.slug}`}
      className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/[0.07] transition-colors"
    >
      <div className="relative aspect-[16/10] border-b border-white/10 bg-black/40 overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.title}
            className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="h-full w-full" />
        )}

        {/* subtle sheen */}
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" />
        </div>
      </div>

      <div className="p-5">
        <div className="text-lg font-semibold text-white">{p.title}</div>
        <div className="mt-1 text-xs text-white/50">
          {p.client ? p.client : "Client"} {p.industry ? `• ${p.industry}` : ""}
        </div>

        <p className="mt-3 text-sm text-white/70 line-clamp-3">
          {p.summary ?? "Full breakdown: problem → approach → build → results."}
        </p>

        <div className="mt-5 text-sm text-white/70 group-hover:text-white transition-colors">
          View case study →
        </div>
      </div>
    </Link>
  );
}

export default async function WorkIndexPage() {
  const featured = await sanityClient.fetch<Item[]>(featuredWorkQuery);
  const all = await sanityClient.fetch<Item[]>(allWorkQuery);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">Work</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
              Case Studies
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Interactive builds, systems, and experiences. Full storytelling breakdowns.
            </p>
          </div>

          <Link
            href="/#fit"
            className="hidden md:inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            Start a project →
          </Link>
        </div>

        {featured.length ? (
          <>
            <div className="mt-12 flex items-center justify-between">
              <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                Featured
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((p) => (
                <Card key={p._id} p={p} />
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-12 flex items-center justify-between">
          <div className="text-xs tracking-[0.25em] uppercase text-white/55">
            All Work
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {all.map((p) => (
            <Card key={p._id} p={p} />
          ))}
        </div>

        {!all.length ? (
          <div className="mt-12 text-white/60">
            Add projects in Sanity to populate this page.
          </div>
        ) : null}
      </div>
    </main>
  );
}
