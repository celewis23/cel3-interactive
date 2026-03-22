import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

// GET single case study
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
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
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;
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
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/work/[slug]", "page");
  return NextResponse.json(updated);
}

// DELETE case study
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "manage");
  if (authErr) return authErr;
  const { id } = await params;

  await sanityWriteClient.delete(id);
  revalidatePath("/");
  revalidatePath("/work");
  revalidatePath("/work/[slug]", "page");
  return NextResponse.json({ ok: true });
}
