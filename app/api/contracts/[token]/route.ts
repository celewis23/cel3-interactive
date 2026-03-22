import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const contract = await sanityServer.fetch(
      `*[_type == "contract" && signingToken == $tok][0]{
        _id, number, date, expiryDate, status, clientName, clientEmail,
        clientCompany, templateName, category, body, variables,
        sentAt, viewedAt, signedAt, declinedAt, signerName
      }`,
      { tok: token }
    );

    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mark as viewed if first time
    if (contract.status === "sent") {
      await sanityWriteClient
        .patch(contract._id)
        .set({ status: "viewed", viewedAt: new Date().toISOString() })
        .commit();
      contract.status = "viewed";
      contract.viewedAt = new Date().toISOString();
    }

    return NextResponse.json(contract);
  } catch (err) {
    console.error("PUBLIC_CONTRACT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { action, signatureData, signatureType, signerName } = body;

    if (!["sign", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const contract = await sanityServer.fetch<{
      _id: string;
      number: string;
      status: string;
      clientName: string;
      clientEmail: string | null;
    }>(
      `*[_type == "contract" && signingToken == $tok][0]{
        _id, number, status, clientName, clientEmail
      }`,
      { tok: token }
    );

    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["sent", "viewed"].includes(contract.status)) {
      return NextResponse.json({ error: "Contract cannot be actioned in its current state" }, { status: 409 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = new Date().toISOString();

    if (action === "decline") {
      await sanityWriteClient
        .patch(contract._id)
        .set({ status: "declined", declinedAt: now })
        .commit();

      return NextResponse.json({ success: true, status: "declined" });
    }

    // Sign
    if (!signatureData || !signatureType || !signerName?.trim()) {
      return NextResponse.json({ error: "signatureData, signatureType, and signerName are required" }, { status: 400 });
    }

    await sanityWriteClient
      .patch(contract._id)
      .set({
        status: "signed",
        signedAt: now,
        signatureData,
        signatureType,
        signatureIp: ip,
        signerName: signerName.trim(),
      })
      .commit();

    // Send confirmation emails (best-effort)
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        `https://${req.headers.get("host")}`;
      const adminEmail = process.env.ADMIN_EMAIL;

      const confirmHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <div style="margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;">CEL3 Interactive</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px;">Contract Signed</div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="font-weight:600;color:#166534;font-size:16px;">&#10003; Contract ${contract.number} has been signed</div>
    <div style="color:#166534;margin-top:4px;font-size:14px;">Signed by ${signerName.trim()} on ${new Date(now).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <p style="color:#374151;font-size:14px;">A copy of this signature has been recorded. You can <a href="${siteUrl}/contracts/${token}" style="color:#0ea5e9;">view the contract here</a>.</p>
  <div style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
    IP address recorded: ${ip} &middot; Timestamp: ${now}
  </div>
</body>
</html>`;

      const promises: Promise<unknown>[] = [];

      if (contract.clientEmail) {
        promises.push(
          sendEmail({
            to: contract.clientEmail,
            subject: `Contract ${contract.number} signed — confirmation`,
            htmlBody: confirmHtml,
          })
        );
      }

      if (adminEmail) {
        promises.push(
          sendEmail({
            to: adminEmail,
            subject: `Contract ${contract.number} signed by ${signerName.trim()}`,
            htmlBody: confirmHtml,
          })
        );
      }

      await Promise.allSettled(promises);
    } catch (err) {
      console.error("CONTRACT_SIGN_EMAIL_ERR:", err);
    }

    return NextResponse.json({ success: true, status: "signed" });
  } catch (err) {
    console.error("PUBLIC_CONTRACT_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to process contract action" }, { status: 500 });
  }
}
