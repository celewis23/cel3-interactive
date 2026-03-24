export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { getGmailSignature } from "@/lib/gmail/api";

const SIGNATURE_ID = "email-signature-settings";

async function saveHtml(html: string) {
  try {
    await sanityWriteClient
      .patch(SIGNATURE_ID)
      .set({ _type: "emailSettings", html })
      .commit({ autoGenerateArrayKeys: true });
  } catch {
    await sanityWriteClient.createOrReplace({
      _id: SIGNATURE_ID,
      _type: "emailSettings",
      html,
    });
  }
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const doc = await sanityServer.fetch(
      `*[_id == $id][0]{ html }`,
      { id: SIGNATURE_ID }
    );
    const localHtml: string = doc?.html ?? "";

    // If no local signature is saved yet, try to pull from Gmail and auto-save it
    if (!localHtml) {
      try {
        const gmailHtml = await getGmailSignature();
        if (gmailHtml) {
          await saveHtml(gmailHtml);
          return NextResponse.json({ html: gmailHtml, source: "gmail" });
        }
      } catch {
        // Gmail not connected or no signature set — fall through
      }
    }

    return NextResponse.json({ html: localHtml, source: "local" });
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
    await saveHtml(html ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SIGNATURE_PUT_ERROR:", err);
    return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
  }
}

// POST /api/admin/email/signature — import fresh copy from Gmail (overwrite local)
export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const gmailHtml = await getGmailSignature();
    if (!gmailHtml) {
      return NextResponse.json({ error: "No Gmail signature found" }, { status: 404 });
    }
    await saveHtml(gmailHtml);
    return NextResponse.json({ html: gmailHtml, ok: true });
  } catch (err) {
    console.error("SIGNATURE_IMPORT_ERROR:", err);
    return NextResponse.json({ error: "Failed to import Gmail signature" }, { status: 500 });
  }
}
