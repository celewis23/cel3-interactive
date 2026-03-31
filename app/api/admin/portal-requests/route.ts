import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "clients", "view");
  if (authErr) return authErr;

  try {
    const tickets = await sanityServer.fetch(
      `*[_type == "clientPortalTicket"] | order(updatedAt desc){
        _id, title, description, status, priority, projectId, projectName,
        portalUserId, stripeCustomerId, pipelineContactId, clientEmail,
        createdAt, updatedAt, adminNotes, driveFolderId, attachments
      }`
    );
    return NextResponse.json({ tickets });
  } catch (err) {
    console.error("ADMIN_PORTAL_REQUESTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load client requests" }, { status: 500 });
  }
}
