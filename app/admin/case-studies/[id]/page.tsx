import CaseStudyForm from "@/components/admin/CaseStudyForm";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { sanityServer } from "@/lib/sanityServer";
import imageUrlBuilder from "@sanity/image-url";
import { createClient } from "next-sanity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  useCdn: false,
});
const builder = imageUrlBuilder(client);

type BodyBlock = {
  _type: string;
  style?: string;
  children?: Array<{ text: string }>;
};

type Section = {
  heading: string;
  content: string;
};

function bodyToSections(body: BodyBlock[]): Section[] {
  if (!body || body.length === 0) return [{ heading: "", content: "" }];
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const block of body) {
    if (block._type === "block") {
      const text = block.children?.map((c) => c.text).join("") || "";
      if (block.style === "h2") {
        if (currentSection) sections.push(currentSection);
        currentSection = { heading: text, content: "" };
      } else {
        if (!currentSection) currentSection = { heading: "", content: "" };
        currentSection.content += (currentSection.content ? "\n\n" : "") + text;
      }
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections.length ? sections : [{ heading: "", content: "" }];
}

export default async function EditCaseStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;

  const project = await sanityServer.fetch(
    `*[_type == "project" && _id == $id][0]{
      _id, title, "slug": slug.current, summary, featured, client, industry, timeline,
      stack, results, heroImage, gallery, body
    }`,
    { id }
  );

  if (!project) {
    return (
      <div className="py-20 text-center text-white/40">Case study not found.</div>
    );
  }

  // Build preview URLs for existing images
  const heroImagePreview = project.heroImage
    ? builder.image(project.heroImage).width(600).height(300).fit("crop").url()
    : null;

  const galleryPreviews = (project.gallery || []).map((img: unknown) =>
    builder.image(img as Parameters<typeof builder.image>[0]).width(200).height(200).fit("crop").url()
  );

  const sections = bodyToSections(project.body || []);

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs text-white/40 mb-1">
          <a href="/admin/case-studies" className="hover:text-white/60">Case Studies</a> /
          <span className="ml-1">{project.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{project.title}</h1>
          {project.featured && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
              Featured
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-sm text-white/40">/{project.slug}</span>
          <a
            href={`/work/${project.slug}`}
            target="_blank"
            className="text-xs text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            View live →
          </a>
        </div>
      </div>
      <CaseStudyForm
        mode="edit"
        initial={{
          ...project,
          sections,
          heroImagePreview,
          galleryPreviews,
        }}
      />
    </div>
  );
}
