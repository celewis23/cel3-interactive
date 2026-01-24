import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity.client";
import { workBySlugQuery, workSlugsQuery } from "@/lib/sanity.queries";
import type { WorkDetail } from "@/lib/types";
import { urlFor } from "@/lib/sanity.image";
import { Portable } from "@/components/sanity/Portable";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await sanityClient.fetch<{ slug: string }[]>(workSlugsQuery);
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;          // ✅ unwrap params
  if (!slug) return { title: "Case Study" };

  const data = await sanityClient.fetch<WorkDetail | null>(workBySlugQuery, { slug });
  if (!data) return { title: "Case Study" };

  return {
    title: `${data.title} | Work`,
    description: data.summary ?? "Case study",
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;          // ✅ unwrap params
  if (!slug) return notFound();

  const data = await sanityClient.fetch<WorkDetail | null>(workBySlugQuery, { slug });
  if (!data) return notFound();

  const heroUrl = data.heroImage
    ? urlFor(data.heroImage).width(1600).height(1000).fit("crop").url()
    : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <Link href="/work" className="text-sm text-white/60 hover:text-white transition-colors">
          ← Back to Work
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">Case Study</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
              {data.title}
            </h1>

            {data.summary ? (
              <p className="mt-4 text-white/75 text-base md:text-lg max-w-2xl">
                {data.summary}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {data.client ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  Client: {data.client}
                </span>
              ) : null}
              {data.industry ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  Industry: {data.industry}
                </span>
              ) : null}
              {data.timeline ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  Timeline: {data.timeline}
                </span>
              ) : null}
              {data.services?.length ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  Services: {data.services.map((s) => s.title).join(", ")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="aspect-[16/10] bg-black/40">
                {heroUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroUrl} alt={data.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>

              <div className="p-5">
                {data.results?.length ? (
                  <>
                    <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                      Outcomes
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-white/75">
                      {data.results.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-white/40">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-white/60">
                    Add results bullets in Sanity to show measurable outcomes here.
                  </p>
                )}

                {data.stack?.length ? (
                  <div className="mt-6">
                    <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                      Stack
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.stack.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {data.body?.length ? (
              <Portable value={data.body} />
            ) : (
              <div className="text-white/60">
                Add your full case study story in Sanity (Problem → Approach → Build → Results).
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                Gallery
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(data.gallery ?? []).slice(0, 6).map((img, i) => {
                  const url = urlFor(img).width(800).height(600).fit("crop").url();
                  return (
                    <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${data.title} ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  );
                })}

                {!data.gallery?.length ? (
                  <div className="col-span-2 text-sm text-white/60">
                    Add gallery images in Sanity to show key screens.
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm text-white/80">Want something like this?</div>
                <p className="mt-2 text-sm text-white/60">
                  Send a Fit request and we’ll map scope, timeline, and build strategy.
                </p>
                <a
                  href="/#fit"
                  className="mt-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  Let’s Talk →
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
