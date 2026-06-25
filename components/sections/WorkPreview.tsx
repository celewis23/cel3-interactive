import Link from "next/link";
import { sanityServer } from "@/lib/sanityServer";
import { featuredWorkQuery } from "@/lib/sanity.queries";
import { urlFor } from "@/lib/sanity.image";
import { getWorkHeroFallback } from "@/lib/workFallbacks";
import { workCatalogSections, type WorkCatalogProject } from "@/lib/workCatalog";
import WorkPreviewClient from "./WorkPreviewClient";

type Item = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  heroImage?: unknown;
  heroUrl?: string | null;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function typeLabel(type: WorkCatalogProject["type"]) {
  if (type === "saas-projects") return "SaaS Project";
  if (type === "web-apps-mobile-apps") return "Web App / Mobile App";
  return "Website & Business System";
}

function toPreviewItem(project: WorkCatalogProject, raw: Item[]) {
  const sanityMatch = raw.find((item) => (
    item.slug === project.slug ||
    normalize(item.title) === normalize(project.title) ||
    (item.client ? normalize(item.client) === normalize(project.title) : false)
  ));

  return {
    _id: sanityMatch?._id ?? `catalog-${project.type}-${project.slug}`,
    title: project.title,
    slug: sanityMatch?.slug ?? project.slug,
    summary: sanityMatch?.summary ?? project.summary,
    client: project.client ?? sanityMatch?.client,
    industry: typeLabel(project.type),
    tags: project.tags,
    href: sanityMatch ? `/work/${sanityMatch.slug}` : null,
    heroUrl: sanityMatch?.heroImage
      ? urlFor(sanityMatch.heroImage).width(1400).height(900).fit("crop").url()
      : project.image ?? getWorkHeroFallback(project.slug),
  };
}

export default async function WorkPreview() {
  const raw = await sanityServer.fetch<Item[]>(featuredWorkQuery);
  const items = workCatalogSections.flatMap((section) => section.projects.slice(0, 2)).map((project) =>
    toPreviewItem(project, raw),
  );

  return (
    <section id="work" className="relative mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">Work</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Work by Platform Type
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Client business systems, SaaS products, and app-style builds grouped by
            the kind of platform they became.
          </p>
        </div>

        <Link
          href="/work"
          className="hidden md:inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-[rgb(var(--accent))]/100 transition-colors"
        >
          View all work →
        </Link>
      </div>

      <div className="mt-10">
        {items.length ? (
          <WorkPreviewClient items={items.slice(0, 6)} />
        ) : (
          <div className="text-white/60">Project categories are being prepared.</div>
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
