import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listSubscribers, createSubscriber } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
  const subscribers = await listSubscribers().catch(() => []);
  return NextResponse.json({ subscribers });
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    // Support bulk import: { emails: ["a@b.com", ...] } or single { email, name }
    if (Array.isArray(body.emails)) {
      const results = await Promise.allSettled(
        body.emails
          .filter((e: unknown) => typeof e === "string" && e.includes("@"))
          .map((e: string) => createSubscriber(e))
      );
      const added = results.filter((r) => r.status === "fulfilled").length;
      return NextResponse.json({ added }, { status: 201 });
    }
    if (!body.email?.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    const subscriber = await createSubscriber(body.email, body.name ?? null);
    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_SUBSCRIBERS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to add subscriber" }, { status: 500 });
  }
}
