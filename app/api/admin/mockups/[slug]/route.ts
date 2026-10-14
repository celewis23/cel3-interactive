import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getMockupBySlug, listChoicesForMockup, setMockupStatus, type MockupStatus } from "@/lib/mockups/db";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authErr = await requirePermission(req, "mockups", "view");
  if (authErr) return authErr;

  try {
    const { slug } = await params;
    const mockup = await getMockupBySlug(slug);
    if (!mockup) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const choices = await listChoicesForMockup(slug);
    return NextResponse.json({ mockup, choices });
  } catch (err) {
    console.error("ADMIN_MOCKUP_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch mockup" }, { status: 500 });
  }
}

async function handleActivityPATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authErr = await requirePermission(req, "mockups", "edit");
  if (authErr) return authErr;

  try {
    const { slug } = await params;
    const body = await req.json();
    const status = body?.status;
    if (status !== "staged" && status !== "sent") {
      return NextResponse.json({ error: "status must be 'staged' or 'sent'" }, { status: 400 });
    }
    const mockup = await setMockupStatus(slug, status as MockupStatus);
    if (!mockup) return NextResponse.json({ error: "Not found" }, { status: 404 });

    logAudit(req, {
      action: "mockup.status_changed",
      resourceType: "mockup",
      resourceId: slug,
      resourceLabel: mockup.name,
      description: `${mockup.name} marked ${status}.`,
    });

    return NextResponse.json(mockup);
  } catch (err) {
    console.error("ADMIN_MOCKUP_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update mockup" }, { status: 500 });
  }
}

export const PATCH = withActivity("/api/admin/mockups/[slug]", "PATCH", handleActivityPATCH);
