import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "contracts", "view");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const template = await sanityServer.fetch(
      `*[_type == "contractTemplate" && _id == $id][0]`,
      { id }
    );
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (err) {
    console.error("CONTRACT_TEMPLATE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "contracts", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if ("name" in body) patch.name = body.name?.trim() || null;
    if ("category" in body) patch.category = body.category;
    if ("body" in body) patch.body = body.body;
    if ("variables" in body) patch.variables = body.variables;
    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("CONTRACT_TEMPLATE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "contracts", "delete");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("CONTRACT_TEMPLATE_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
