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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const form = await sanityServer.fetch(`*[_type == "cel3Form" && _id == $id][0]`, { id });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(form);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (body.slug) {
    const conflict = await sanityServer.fetch(
      `*[_type == "cel3Form" && slug == $slug && _id != $id][0]._id`,
      { slug: String(body.slug).trim(), id }
    );
    if (conflict) return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const patch = sanityWriteClient.patch(id);
  if (body.title !== undefined) patch.set({ title: String(body.title).trim() });
  if (body.description !== undefined) patch.set({ description: body.description });
  if (body.slug !== undefined) patch.set({ slug: String(body.slug).trim() });
  if (body.isPublic !== undefined) patch.set({ isPublic: body.isPublic });
  if (body.isActive !== undefined) patch.set({ isActive: body.isActive });
  if (body.fields !== undefined) patch.set({ fields: body.fields });

  const updated = await patch.commit();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await sanityWriteClient.delete(id);

  // Cascade delete submissions, notifications, and logs
  const [submissions, notifications] = await Promise.all([
    sanityServer.fetch<Array<{ _id: string }>>(`*[_type == "cel3FormSubmission" && formId == $id]{ _id }`, { id }),
    sanityServer.fetch<Array<{ _id: string }>>(`*[_type == "cel3FormNotification" && formId == $id]{ _id }`, { id }),
  ]);

  for (const s of submissions) await sanityWriteClient.delete(s._id);
  for (const n of notifications) await sanityWriteClient.delete(n._id);

  return NextResponse.json({ ok: true });
}
