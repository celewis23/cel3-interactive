import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [forms, subs] = await Promise.all([
    sanityServer.fetch<Array<{ _id: string; title: string; slug: string; isPublic: boolean; isActive: boolean; _createdAt: string }>>(
      `*[_type == "cel3Form"] | order(_createdAt desc){ _id, title, slug, isPublic, isActive, _createdAt }`
    ),
    sanityServer.fetch<Array<{ formId: string }>>(
      `*[_type == "cel3FormSubmission"]{ formId }`
    ),
  ]);

  const countMap: Record<string, number> = {};
  for (const s of subs) countMap[s.formId] = (countMap[s.formId] || 0) + 1;

  return NextResponse.json(forms.map(f => ({ ...f, submissionCount: countMap[f._id] || 0 })));
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim();

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  const existing = await sanityServer.fetch(
    `*[_type == "cel3Form" && slug == $slug][0]._id`,
    { slug }
  );
  if (existing) return NextResponse.json({ error: "Slug already in use" }, { status: 409 });

  const created = await sanityWriteClient.create({
    _type: "cel3Form",
    title,
    description: String(body.description || "").trim(),
    slug,
    isPublic: body.isPublic ?? false,
    isActive: body.isActive ?? true,
    fields: [],
  });

  return NextResponse.json(created, { status: 201 });
}
