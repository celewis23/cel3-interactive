// GET /api/admin/email/links?threadId=xxx — get link for a thread
// POST /api/admin/email/links — create a link between a thread and a record
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const recordId = searchParams.get("recordId");

    if (threadId) {
      const link = await sanityServer.fetch(
        `*[_type == "gmailThreadLink" && gmailThreadId == $threadId][0]`,
        { threadId }
      );
      return NextResponse.json({ link: link ?? null });
    }

    if (recordId) {
      const links = await sanityServer.fetch(
        `*[_type == "gmailThreadLink" && linkedRecordId == $recordId] | order(linkedAt desc)`,
        { recordId }
      );
      return NextResponse.json({ links });
    }

    return NextResponse.json(
      { error: "threadId or recordId query param required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json({ error: "Failed to get links" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const {
      gmailThreadId,
      linkedRecordType,
      linkedRecordId,
      linkedRecordName,
      subject,
    } = body;
    if (!gmailThreadId || !linkedRecordType || !linkedRecordId) {
      return NextResponse.json(
        {
          error:
            "gmailThreadId, linkedRecordType, linkedRecordId are required",
        },
        { status: 400 }
      );
    }
    const doc = {
      _id: `gmailLink_${gmailThreadId}`,
      _type: "gmailThreadLink",
      gmailThreadId,
      linkedRecordType,
      linkedRecordId,
      linkedRecordName: linkedRecordName ?? "",
      linkedAt: new Date().toISOString(),
      subject: subject ?? "",
    };
    await sanityWriteClient.createOrReplace(doc);
    return NextResponse.json({ ok: true, link: doc }, { status: 201 });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}
