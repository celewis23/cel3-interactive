import Link from "next/link";
import { sanityClient } from "@/lib/sanity.client";
import { featuredWorkQuery } from "@/lib/sanity.queries";
import { urlFor } from "@/lib/sanity.image";
import WorkPreviewClient from "./WorkPreviewClient";

type Item = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  heroImage?: any;
  heroUrl?: string | null;
};

export default async function WorkPreview() {
  const raw = await sanityClient.fetch<Item[]>(featuredWorkQuery);

  const items = raw.map((p) => ({
    ...p,
    heroUrl: p.heroImage
      ? urlFor(p.heroImage).width(1400).height(900).fit("crop").url()
      : null,
  }));

  return (
    <section id="work" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">Work</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Featured Case Studies
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            A few recent builds. Full breakdowns live inside each case study.
          </p>
        </div>

        <Link
          href="/work"
          className="hidden md:inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          View all work →
        </Link>
      </div>

      <div className="mt-10">
        {items.length ? (
          <WorkPreviewClient items={items.slice(0, 6)} />
        ) : (
          <div className="text-white/60">No projects yet.</div>
        )}
      </div>

      <div className="mt-8 md:hidden">
        <Link
          href="/work"
          className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          View all work →
        </Link>
      </div>
    </section>
  );
}
