import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "onboarding", "view");
  if (authErr) return authErr;
  try {
    const templates = await sanityServer.fetch(
      `*[_type == "onboardingTemplate"] | order(_createdAt desc) {
        _id, name, description, category, steps, _createdAt
      }`
    );
    return NextResponse.json(templates);
  } catch (err) {
    console.error("ONBOARDING_TEMPLATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "onboarding", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const template = await sanityWriteClient.create({
      _type: "onboardingTemplate",
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category: body.category || "general",
      steps: (body.steps ?? []).map((s: Record<string, unknown>, i: number) => ({
        _key: crypto.randomUUID(),
        order: i,
        title: s.title || "",
        description: s.description || null,
        dueDateOffsetDays: s.dueDateOffsetDays ?? null,
        actionType: s.actionType || "manual",
      })),
    });
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("ONBOARDING_TEMPLATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
