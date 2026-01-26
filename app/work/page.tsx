import Link from "next/link";
import { sanityClient } from "@/lib/sanity.client";
import { workIndexQuery } from "@/lib/sanity.queries";
import type { WorkCard } from "@/lib/types";
import { urlFor } from "@/lib/sanity.image";
import { NavBar } from "@/components/nav/NavBar";

export const revalidate = 60; // refresh content every 60s

export default async function WorkPage() {
  const items = await sanityClient.fetch<WorkCard[]>(workIndexQuery);

  return (
    <main className="min-h-screen bg-black text-white">
        <NavBar />
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">Work</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
              Case Studies
            </h1>
            <p className="mt-4 max-w-2xl text-white/70">
              Interactive builds, systems, and experiences. Full storytelling breakdowns.
            </p>
          </div>
          <div className="hidden md:block text-sm text-white/50">
            Last Udated: 1/26/2026 @ 9AM EST
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => {
            const img = p.heroImage
              ? urlFor(p.heroImage).width(1200).height(800).fit("crop").url()
              : null;

            return (
              <Link
                key={p._id}
                href={`/work/${p.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/[0.07] transition-colors"
              >
                <div className="relative aspect-[16/10] border-b border-white/10 bg-black/40">
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

                  {p.featured ? (
                    <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur">
                      Featured
                    </div>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="text-lg font-semibold">{p.title}</div>
                  <div className="mt-1 text-xs text-white/50">
                    {p.client ? p.client : "Client"} {p.industry ? `• ${p.industry}` : ""}
                  </div>
                  {p.summary ? (
                    <p className="mt-3 text-sm text-white/70 line-clamp-3">
                      {p.summary}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-white/50">
                      Full breakdown: problem → approach → build → results.
                    </p>
                  )}

                  <div className="mt-5 text-sm text-white/70 group-hover:text-white transition-colors">
                    View case study →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
