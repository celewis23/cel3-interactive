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

// GET single case study
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await sanityServer.fetch(
    `*[_type == "project" && _id == $id][0]{
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
      body
    }`,
    { id }
  );

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

// PATCH update case study
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  const allowed = ["title", "slug", "summary", "featured", "client", "industry", "timeline", "stack", "results", "body", "heroImage", "gallery"];
  for (const key of allowed) {
    if (key in body) {
      if (key === "slug") {
        patch.slug = { _type: "slug", current: body.slug };
      } else {
        patch[key] = body[key];
      }
    }
  }

  const updated = await sanityWriteClient.patch(id).set(patch).commit();
  return NextResponse.json(updated);
}

// DELETE case study
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await sanityWriteClient.delete(id);
  return NextResponse.json({ ok: true });
}
