export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

const SIGNATURE_ID = "email-signature-settings";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const doc = await sanityServer.fetch(
      `*[_id == $id][0]{ html }`,
      { id: SIGNATURE_ID }
    );
    return NextResponse.json({ html: doc?.html ?? "" });
  } catch (err) {
    console.error("SIGNATURE_GET_ERROR:", err);
    return NextResponse.json({ html: "" });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const { html } = await req.json() as { html: string };
    await sanityWriteClient
      .patch(SIGNATURE_ID)
      .set({ _type: "emailSettings", html: html ?? "" })
      .commit({ autoGenerateArrayKeys: true })
      .catch(async () => {
        // Document doesn't exist yet — create it
        await sanityWriteClient.createOrReplace({
          _id: SIGNATURE_ID,
          _type: "emailSettings",
          html: html ?? "",
        });
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SIGNATURE_PUT_ERROR:", err);
    return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
  }
}
