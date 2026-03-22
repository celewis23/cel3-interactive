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

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
