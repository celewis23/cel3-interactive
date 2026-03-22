import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

// GET all case studies
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await sanityServer.fetch(`
    *[_type == "project"] | order(featured desc, _createdAt desc) {
      _id,
      title,
      "slug": slug.current,
      summary,
      featured,
      client,
      industry,
      timeline,
      stack,
      results,
      heroImage,
      gallery,
      body,
      _createdAt,
      _updatedAt
    }
  `);

  return NextResponse.json(projects);
}

// POST create new case study
export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const doc = {
    _type: "project",
    title: body.title,
    slug: { _type: "slug", current: body.slug },
    summary: body.summary || "",
    featured: body.featured || false,
    client: body.client || "",
    industry: body.industry || "",
    timeline: body.timeline || "",
    stack: body.stack || [],
    results: body.results || [],
    body: body.body || [],
  };

  const created = await sanityWriteClient.create(doc);
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/work/[slug]", "page");
  return NextResponse.json(created, { status: 201 });
}
