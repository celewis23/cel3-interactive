import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "contracts", "view");
  if (authErr) return authErr;
  try {
    const templates = await sanityServer.fetch(
      `*[_type == "contractTemplate"] | order(_createdAt desc) {
        _id, name, category, variables, _createdAt
      }`
    );
    return NextResponse.json(templates);
  } catch (err) {
    console.error("CONTRACT_TEMPLATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "contracts", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const template = await sanityWriteClient.create({
      _type: "contractTemplate",
      name: body.name.trim(),
      category: body.category || "other",
      body: body.body || "",
      variables: body.variables || [],
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("CONTRACT_TEMPLATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
