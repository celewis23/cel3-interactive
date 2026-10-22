import type { MetadataRoute } from "next";
import { sanityServer } from "@/lib/sanityServer";
import { workCaseStudyFallbacks } from "@/lib/workCaseStudies";
import { absoluteUrl, publicPages } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = Object.keys(publicPages).map(path => ({ url: absoluteUrl(path) }));
  const studies = new Map<string, string | undefined>(Object.keys(workCaseStudyFallbacks).map(slug => [slug, undefined]));
  const records = await sanityServer.fetch<Array<{ slug: string; updated?: string }>>(
    `*[_type == "project" && defined(slug.current) && !(_id in path("drafts.**"))]{"slug": slug.current, "updated": _updatedAt}`
  );
  for (const record of records) if (record.slug) studies.set(record.slug, record.updated);
  for (const [slug, updated] of studies) {
    pages.push({ url: absoluteUrl(`/work/${encodeURIComponent(slug)}`),
      ...(updated && Number.isFinite(Date.parse(updated)) ? { lastModified: new Date(updated) } : {}),
    });
  }
  // Omit unknown static modification dates instead of inventing them on each build.
  return pages;
}
