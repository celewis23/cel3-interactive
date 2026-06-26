import Link from "next/link";
import { Metadata } from "next";
import { sanityServer } from "@/lib/sanityServer";
import { urlFor } from "@/lib/sanity.image";
import { allWorkQuery } from "@/lib/sanity.queries";
import { getWorkHeroFallback } from "@/lib/workFallbacks";
import { getWorkCaseStudyFallback } from "@/lib/workCaseStudies";
import { workCatalogSections, type WorkCatalogProject } from "@/lib/workCatalog";

export const metadata: Metadata = {
  title: "Work by Platform Type | CEL3 Interactive",
  description:
    "Explore CEL3 Interactive work across web apps, mobile app experiences, SaaS projects, websites, and digital business systems.",
};

export const revalidate = 60;

type SanityWorkItem = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  heroImage?: unknown;
  featured?: boolean;
};

type DisplayProject = WorkCatalogProject & {
  caseStudySlug?: string;
  caseStudyId?: string;
  caseStudySummary?: string;
  sanityFeatured?: boolean;
  imageUrl?: string | null;
};

const SECTION_COLORS = [
  "from-sky-300/28 via-cyan-300/10 to-white/5",
  "from-emerald-300/24 via-sky-300/10 to-white/5",
  "from-amber-300/24 via-rose-300/10 to-white/5",
  "from-fuchsia-300/22 via-sky-300/10 to-white/5",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function projectInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function mergeProject(project: WorkCatalogProject, sanityItems: SanityWorkItem[]): DisplayProject {
  const sanityMatch = sanityItems.find((item) => (
    item.slug === project.slug ||
    normalize(item.title) === normalize(project.title) ||
    (item.client ? normalize(item.client) === normalize(project.title) : false)
  ));
  const fallback = getWorkCaseStudyFallback(project.slug);

  const imageUrl = project.image ?? (
    sanityMatch?.heroImage
      ? urlFor(sanityMatch.heroImage).width(1400).height(900).fit("crop").url()
      : getWorkHeroFallback(project.slug)
  );

  return {
    ...project,
    caseStudySlug: sanityMatch?.slug ?? fallback?.slug,
    caseStudyId: sanityMatch?._id,
    caseStudySummary: sanityMatch?.summary ?? fallback?.summary,
    sanityFeatured: sanityMatch?.featured,
    client: project.client ?? sanityMatch?.client,
    imageUrl,
  };
}

function sanityOnlyProjects(sanityItems: SanityWorkItem[]): DisplayProject[] {
  const catalogKeys = new Set(
    workCatalogSections.flatMap((section) => section.projects).flatMap((project) => [
      project.slug,
      normalize(project.title),
      project.client ? normalize(project.client) : "",
    ]),
  );

  return sanityItems
    .filter((item) => !catalogKeys.has(item.slug) && !catalogKeys.has(normalize(item.title)))
    .map((item) => ({
      title: item.title,
      slug: item.slug,
      type: "web-apps-mobile-apps",
      client: item.client,
      summary:
        item.summary ??
        "A custom CEL3 project combining public experience, platform thinking, and business workflow design.",
      tags: [item.industry, "Case study", "Custom build"].filter((tag): tag is string => Boolean(tag)),
      featured: item.featured,
      caseStudySlug: item.slug,
      caseStudyId: item._id,
      caseStudySummary: item.summary,
      sanityFeatured: item.featured,
      imageUrl: item.heroImage
        ? urlFor(item.heroImage).width(1400).height(900).fit("crop").url()
        : getWorkHeroFallback(item.slug),
    }));
}

function GeneratedPreview({ project, index }: { project: DisplayProject; index: number }) {
  const gradient = SECTION_COLORS[index % SECTION_COLORS.length];

  return (
    <div className={`relative flex h-full min-h-[210px] items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] opacity-35" />
      <div className="absolute left-5 top-5 h-2.5 w-2.5 rounded-full bg-sky-300" />
      <div className="absolute right-6 top-7 h-10 w-10 rounded-full border border-white/18 bg-white/5" />
      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
        <div className="h-2 rounded-full bg-white/18" />
        <div className="h-2 rounded-full bg-white/10" />
        <div className="h-2 rounded-full bg-white/14" />
      </div>
      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/18 bg-black/32 text-3xl font-semibold text-white shadow-2xl backdrop-blur">
        {projectInitials(project.title)}
      </div>
    </div>
  );
}

function ProjectCard({ project, index }: { project: DisplayProject; index: number }) {
  const hasCaseStudy = Boolean(project.caseStudySlug);
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-black/40">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.title}
            className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
          />
        ) : (
          <GeneratedPreview project={project} index={index} />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
        <div className="absolute left-4 top-4 rounded-full border border-white/14 bg-black/42 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 backdrop-blur">
          {hasCaseStudy ? "Case study" : "Project snapshot"}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{project.title}</h3>
            <p className="mt-1 text-xs text-white/46">
              {project.client ? `${project.client} / ` : ""}
              {project.type === "saas-projects"
                ? "SaaS project"
                : project.type === "web-apps-mobile-apps"
                  ? "Web app / mobile experience"
                  : "Website & business system"}
            </p>
          </div>
          {project.featured || project.sanityFeatured ? (
            <span className="shrink-0 rounded-full bg-sky-300/14 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
              Featured
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-6 text-white/68">
          {project.caseStudySummary ?? project.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {project.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 text-sm font-medium text-white/68 transition-colors group-hover:text-white">
          {hasCaseStudy ? "View case study" : "Case study details can be added"}
        </div>
      </div>
    </>
  );

  if (project.caseStudySlug) {
    return (
      <Link
        href={`/work/${project.caseStudySlug}`}
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition-colors hover:border-sky-300/28 hover:bg-white/[0.065]"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
      {content}
    </article>
  );
}

export default async function WorkIndexPage() {
  const sanityItems = await sanityServer.fetch<SanityWorkItem[]>(allWorkQuery);
  const extraCaseStudies = sanityOnlyProjects(sanityItems);
  const featuredProjects = workCatalogSections
    .flatMap((section) => section.projects)
    .filter((project) => project.featured)
    .map((project) => mergeProject(project, sanityItems));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-white/55">Work by platform type</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              Websites, SaaS products, apps, and business systems built with the same platform mindset.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
              Explore CEL3 work by the kind of system being built: client business systems,
              original SaaS projects, and app-style digital products.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Project types</p>
            <div className="mt-4 grid gap-2">
              {workCatalogSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-xl border border-white/8 bg-black/22 px-4 py-3 text-sm text-white/68 transition-colors hover:border-sky-300/30 hover:text-white"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {featuredProjects.length ? (
          <section className="mt-14">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs tracking-[0.25em] uppercase text-white/50">Featured</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Cross-section of the work</h2>
              </div>
              <Link
                href="/build-your-platform"
                className="inline-flex w-fit rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-300 hover:text-black"
              >
                Build Your Platform
              </Link>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {featuredProjects.slice(0, 4).map((project, index) => (
                <ProjectCard key={`${project.type}-${project.slug}`} project={project} index={index} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-16 space-y-16">
          {workCatalogSections.map((section) => {
            const projects = [
              ...section.projects.map((project) => mergeProject(project, sanityItems)),
              ...(section.id === "web-apps-mobile-apps" ? extraCaseStudies : []),
            ];
            return (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300/80">
                      {section.eyebrow}
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                      {section.label}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58 md:text-base">
                      {section.description}
                    </p>
                  </div>
                  <p className="text-sm text-white/38">
                    {projects.length} project{projects.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project, index) => (
                    <ProjectCard key={`${section.id}-${project.slug}`} project={project} index={index} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">Next</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Want your project shown here next?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                Use the platform builder to map the website, tools, automations, AI features,
                and business workflows that belong in your first build.
              </p>
            </div>
            <Link
              href="/build-your-platform"
              className="inline-flex rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-sky-200"
            >
              Build Your Platform
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
