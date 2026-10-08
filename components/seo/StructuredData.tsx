import { caseStudyGraph, publicPageGraph, serializeSchema } from "@/lib/seo/schema";

export function PageStructuredData({ path }: { path: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(publicPageGraph(path)) }} />;
}

export function CaseStudyStructuredData({ work, image }: { work: { title: string; slug: string; summary?: string | null }; image?: string | null }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(caseStudyGraph(work, image)) }} />;
}
