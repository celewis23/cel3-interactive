import Link from "next/link";
import { sanityClient } from "@/lib/sanity.client";
import { featuredWorkQuery } from "@/lib/sanity.queries";
import { urlFor } from "@/lib/sanity.image";

type Item = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  heroImage?: any;
};

export default async function WorkPreview() {
  const items = await sanityClient.fetch<Item[]>(featuredWorkQuery);

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
              </div>

              <div className="p-5">
                <div className="text-lg font-semibold">{p.title}</div>
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
        })}

        {!items.length ? (
          <div className="text-white/60">
            Mark at least one Project as <b>Featured</b> in Sanity to show it here.
          </div>
        ) : null}
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
