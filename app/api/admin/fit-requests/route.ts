import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const q = (searchParams.get("q") ?? "").trim();

    const requests = await sanityServer.fetch(
      `*[
        _type == "fitRequest" &&
        ($status == "all" || coalesce(status, "new") == $status) &&
        (
          $q == "" ||
          name match $match ||
          company match $match ||
          leadEmail match $match ||
          website match $match ||
          threadKey == $exact
        )
      ] | order(coalesce(createdAt, _createdAt) desc)[0...200]{
        _id,
        _createdAt,
        name,
        "leadEmail": coalesce(leadEmail, select(defined(email.threadKey) => null, email)),
        company,
        website,
        budget,
        timeline,
        services,
        message,
        source,
        "status": coalesce(status, "new"),
        createdAt,
        threadKey,
        "emailMeta": select(defined(email.threadKey) => email, null),
        adminNotes,
        contactedAt,
        pipelineContactId
      }`,
      { status, q, match: `${q}*`, exact: q.toUpperCase() }
    );

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("ADMIN_FIT_REQUESTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load fit requests" }, { status: 500 });
  }
}
