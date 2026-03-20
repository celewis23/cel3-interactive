import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nId: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { nId } = await params;
  const body = await req.json();

  const patch = sanityWriteClient.patch(nId);
  if (body.emailAddress !== undefined) patch.set({ emailAddress: String(body.emailAddress).trim() });
  if (body.label !== undefined) patch.set({ label: body.label });
  if (body.isActive !== undefined) patch.set({ isActive: body.isActive });
  if (body.notifyOnEverySubmission !== undefined) patch.set({ notifyOnEverySubmission: body.notifyOnEverySubmission });
  if (body.includeFileLinks !== undefined) patch.set({ includeFileLinks: body.includeFileLinks });

  const updated = await patch.commit();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nId: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { nId } = await params;
  await sanityWriteClient.delete(nId);
  return NextResponse.json({ ok: true });
}
