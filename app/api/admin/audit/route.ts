import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "auditLog", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const userId       = searchParams.get("userId")       ?? null;
  const action       = searchParams.get("action")       ?? null;
  const resourceType = searchParams.get("resourceType") ?? null;
  const resourceId   = searchParams.get("resourceId")   ?? null;
  const from         = searchParams.get("from")         ?? null;
  const to           = searchParams.get("to")           ?? null;
  const offset       = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit        = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const format       = searchParams.get("format") ?? "json";

  // Build GROQ filters
  const filters: string[] = [`_type == "auditEvent"`];
  if (userId)       filters.push(`userId == ${JSON.stringify(userId)}`);
  if (action)       filters.push(`action == ${JSON.stringify(action)} || action match ${JSON.stringify(action + ".*")}`);
  if (resourceType) filters.push(`resourceType == ${JSON.stringify(resourceType)}`);
  if (resourceId)   filters.push(`resourceId == ${JSON.stringify(resourceId)}`);
  if (from)         filters.push(`timestamp >= ${JSON.stringify(from)}`);
  if (to)           filters.push(`timestamp <= ${JSON.stringify(to + "T23:59:59Z")}`);

  const where = filters.join(" && ");

  try {
    if (format === "csv") {
      // Export — fetch up to 5000 events
      const events = await sanityServer.fetch<Array<{
        timestamp: string;
        userName: string;
        userEmail: string;
        action: string;
        resourceType: string;
        resourceId: string | null;
        resourceLabel: string | null;
        description: string;
        ipAddress: string | null;
      }>>(
        `*[${where}] | order(timestamp desc) [0...5000]{
          timestamp, userName, userEmail, action, resourceType,
          resourceId, resourceLabel, description, ipAddress
        }`
      );

      const header = "Timestamp,User,Email,Action,Resource Type,Resource ID,Resource Label,Description,IP Address";
      const rows = events.map((e) => [
        e.timestamp,
        e.userName,
        e.userEmail,
        e.action,
        e.resourceType,
        e.resourceId ?? "",
        e.resourceLabel ?? "",
        e.description,
        e.ipAddress ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // JSON — paginated
    const [events, total] = await Promise.all([
      sanityServer.fetch(
        `*[${where}] | order(timestamp desc) [${offset}...${offset + limit}]{
          _id, timestamp, userId, userName, userEmail, isOwner,
          action, resourceType, resourceId, resourceLabel,
          description, ipAddress, before, after, metadata
        }`
      ),
      sanityServer.fetch<number>(`count(*[${where}])`),
    ]);

    return NextResponse.json({ events, total, offset, limit });
  } catch (err) {
    console.error("AUDIT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
