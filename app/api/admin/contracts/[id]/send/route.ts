import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "contracts", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;

    const contract = await sanityServer.fetch<{
      _id: string;
      number: string;
      date: string;
      expiryDate: string;
      status: string;
      clientName: string;
      clientEmail: string | null;
      clientCompany: string | null;
      templateName: string | null;
      signingToken: string;
    }>(`*[_type == "contract" && _id == $id][0]{
      _id, number, date, expiryDate, status, clientName, clientEmail,
      clientCompany, templateName, signingToken
    }`, { id });

    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!contract.clientEmail) {
      return NextResponse.json({ error: "No client email on this contract" }, { status: 400 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      `https://${req.headers.get("host")}`;
    const signingLink = `${siteUrl}/contracts/${contract.signingToken}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <div style="margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#000;">CEL3 Interactive</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px;">Contract for Signature</div>
  </div>

  <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Contract #</div>
        <div style="font-weight:600;font-size:16px;">${contract.number}</div>
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Date</div>
        <div>${contract.date}</div>
      </div>
      ${contract.expiryDate ? `<div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Expires</div>
        <div>${contract.expiryDate}</div>
      </div>` : ""}
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Prepared for</div>
    <div style="font-weight:600;">${contract.clientName}</div>
    ${contract.clientCompany ? `<div style="color:#6b7280;">${contract.clientCompany}</div>` : ""}
  </div>

  <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:24px;">
    Please review the contract${contract.templateName ? ` — <strong>${contract.templateName}</strong>` : ""} and sign it electronically using the link below. No account or login is required.
  </p>

  <div style="text-align:center;margin:32px 0;">
    <a href="${signingLink}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; Sign Contract</a>
  </div>

  <div style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
    If you did not expect this contract, you can safely ignore this email. Questions? Reply to this email.
  </div>
</body>
</html>`;

    let sent = false;
    let emailError: string | undefined;

    try {
      await sendEmail({
        to: contract.clientEmail,
        subject: `Contract ${contract.number} ready for signature`,
        htmlBody,
      });
      sent = true;
    } catch (err) {
      console.error("CONTRACTS_SEND_EMAIL_ERR:", err);
      emailError = err instanceof Error ? err.message : "Email send failed";
    }

    if (sent && ["draft"].includes(contract.status)) {
      await sanityWriteClient
        .patch(id)
        .set({ status: "sent", sentAt: new Date().toISOString() })
        .commit();
    }

    if (sent) {
      return NextResponse.json({ sent: true, signingLink });
    } else {
      return NextResponse.json({ sent: false, signingLink, error: emailError });
    }
  } catch (err) {
    console.error("CONTRACTS_SEND_ERR:", err);
    return NextResponse.json({ error: "Failed to send contract" }, { status: 500 });
  }
}
