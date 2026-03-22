import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const template = await sanityServer.fetch(
      `*[_type == "onboardingTemplate" && _id == $id][0]`,
      { id }
    );
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (err) {
    console.error("ONBOARDING_TEMPLATE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if ("name" in body) patch.name = body.name?.trim() || null;
    if ("description" in body) patch.description = body.description?.trim() || null;
    if ("category" in body) patch.category = body.category;
    if ("steps" in body) {
      patch.steps = (body.steps ?? []).map((s: Record<string, unknown>, i: number) => ({
        _key: (s._key as string) || crypto.randomUUID(),
        order: i,
        title: s.title || "",
        description: s.description || null,
        dueDateOffsetDays: s.dueDateOffsetDays ?? null,
        actionType: s.actionType || "manual",
      }));
    }
    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ONBOARDING_TEMPLATE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("ONBOARDING_TEMPLATE_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
