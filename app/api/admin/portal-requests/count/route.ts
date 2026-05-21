import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const count = await sanityServer.fetch<number>(
      `count(*[_type == "clientPortalTicket" && status == "submitted"])`
    );
    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("ADMIN_PORTAL_REQUESTS_COUNT_ERR:", err);
    return NextResponse.json({ count: 0 });
  }
}
