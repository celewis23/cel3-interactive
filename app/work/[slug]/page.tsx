import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityServer } from "@/lib/sanityServer";
import { workBySlugQuery, workSlugsQuery } from "@/lib/sanity.queries";
import type { WorkDetail } from "@/lib/types";
import { urlFor } from "@/lib/sanity.image";
import { getWorkGalleryFallback, getWorkHeroFallback } from "@/lib/workFallbacks";
import { getWorkCaseStudyFallback, workCaseStudyFallbacks } from "@/lib/workCaseStudies";
import { Portable } from "@/components/sanity/Portable";
import {
  CaseStudyGalleryPreview,
  CaseStudyGalleryProvider,
  CaseStudyGalleryThumbnails,
} from "@/components/work/CaseStudyGallery";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

const PLATFORM_COMPONENTS = [
  "Public website",
  "Business console",
  "CMS",
  "Booking or commerce workflows",
  "Customer management",
  "Analytics",
  "AI-ready architecture",
] as const;

export async function generateStaticParams() {
  const slugs = await sanityServer.fetch<{ slug: string }[]>(workSlugsQuery);
  const allSlugs = new Set([
    ...slugs.map((s) => s.slug),
    ...Object.keys(workCaseStudyFallbacks),
  ]);
  return Array.from(allSlugs).map((slug) => ({ slug }));
}

function mergeWithFallback(data: WorkDetail | null, fallback: WorkDetail | null) {
  if (!data) return fallback;
  if (!fallback) return data;

  return {
    ...fallback,
    ...data,
    summary: data.summary ?? fallback.summary,
    client: data.client ?? fallback.client,
    industry: data.industry ?? fallback.industry,
    timeline: data.timeline ?? fallback.timeline,
    stack: data.stack?.length ? data.stack : fallback.stack,
    results: data.results?.length ? data.results : fallback.results,
    gallery: data.gallery?.length ? data.gallery : fallback.gallery,
    body: data.body?.length ? data.body : fallback.body,
    services: data.services?.length ? data.services : fallback.services,
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;          // ✅ unwrap params
  if (!slug) return { title: "Case Study" };

  const data = await sanityServer.fetch<WorkDetail | null>(workBySlugQuery, { slug });
  const fallback = getWorkCaseStudyFallback(slug);
  const work = mergeWithFallback(data, fallback);
  if (!work) return { title: "Case Study" };

  return {
    title: `${work.title} | Work`,
    description: work.summary ?? "Case study",
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;          // ✅ unwrap params
  if (!slug) return notFound();

  const data = await sanityServer.fetch<WorkDetail | null>(workBySlugQuery, { slug });
  const fallback = getWorkCaseStudyFallback(slug);
  const work = mergeWithFallback(data, fallback);
  if (!work) return notFound();

  const heroUrl = work.heroImage
    ? urlFor(work.heroImage).width(1600).height(1000).fit("crop").url()
    : getWorkHeroFallback(work.slug);

  const galleryItems = work.gallery?.length
    ? work.gallery.map((img) => urlFor(img).width(800).height(600).fit("crop").url())
    : getWorkGalleryFallback(work.slug);

  return (
    <main className="min-h-screen bg-black text-white">
      <CaseStudyGalleryProvider title={work.title} galleryImages={galleryItems}>
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
          <Link href="/work" className="text-sm text-white/60 hover:text-white transition-colors">
            ← Back to Work
          </Link>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <p className="text-xs tracking-[0.25em] uppercase text-white/55">Case Study</p>
              <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
                {work.title}
              </h1>

              {work.summary ? (
                <p className="mt-4 text-white/75 text-base md:text-lg max-w-2xl">
                  {work.summary}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2 text-xs">
                {work.client ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    Client: {work.client}
                  </span>
                ) : null}
                {work.industry ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    Industry: {work.industry}
                  </span>
                ) : null}
                {work.timeline ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    Timeline: {work.timeline}
                  </span>
                ) : null}
                {work.services?.length ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                    Services: {work.services.map((s) => s.title).join(", ")}
                  </span>
                ) : null}
              </div>

              <CaseStudyGalleryPreview />
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="aspect-[16/10] bg-black/40">
                  {heroUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroUrl} alt={work.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>

                <div className="p-5">
                  {work.results?.length ? (
                    <>
                      <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                        Outcomes
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-white/75">
                        {work.results.map((r, i) => (
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

                  {work.stack?.length ? (
                    <div className="mt-6">
                      <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                        Stack
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {work.stack.map((t, i) => (
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
              {work.body?.length ? (
                <Portable value={work.body} />
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

                <CaseStudyGalleryThumbnails />

                <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-sm text-white/80">Want something like this?</div>
                  <p className="mt-2 text-sm text-white/60">
                    Start a discovery assessment and we’ll map the public experience,
                    business console, workflows, integrations, and first useful release.
                  </p>
                  <a
                    href="/assessment"
                    className="mt-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                  >
                    Start Assessment →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">
              Business framing
            </p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <h2 className="text-sm font-semibold text-white">Problem</h2>
                <p className="mt-2 text-sm text-white/70">
                  The business needed more than a marketing website. The platform had to support
                  customer activity, content, operational visibility, and ongoing management.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <h2 className="text-sm font-semibold text-white">Solution</h2>
                <p className="mt-2 text-sm text-white/70">
                  CEL3 shaped the public experience and supporting platform architecture so the
                  client could manage the business with fewer disconnected tools.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <h2 className="text-sm font-semibold text-white">Business Impact</h2>
                <p className="mt-2 text-sm text-white/70">
                  The result is a centralized system that gives the client more control over daily
                  operations and creates a stronger foundation for future workflow and AI features.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-white">Platform Components</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLATFORM_COMPONENTS.map((component) => (
                  <span
                    key={component}
                    className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/70"
                  >
                    {component}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </CaseStudyGalleryProvider>
    </main>
  );
}
