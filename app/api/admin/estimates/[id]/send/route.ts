import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "estimates", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;

    const estimate = await sanityServer.fetch<{
      _id: string;
      number: string;
      date: string;
      expiryDate: string;
      status: string;
      clientName: string;
      clientEmail: string | null;
      clientCompany: string | null;
      lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }>;
      subtotal: number;
      taxAmount: number;
      discountAmount: number;
      total: number;
      notes: string | null;
      approvalToken: string;
      currency: string;
    }>(`*[_type == "estimate" && _id == $id][0]`, { id });

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!estimate.clientEmail) {
      return NextResponse.json({ error: "No client email on this estimate" }, { status: 400 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      `https://${req.headers.get("host")}`;
    const approvalLink = `${siteUrl}/estimates/${estimate.approvalToken}`;

    const lineItemsHtml = estimate.lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.rate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.amount)}</td>
        </tr>`
      )
      .join("");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <div style="margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#000;">CEL3 Interactive</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px;">Estimate</div>
  </div>

  <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Estimate #</div>
        <div style="font-weight:600;font-size:16px;">${estimate.number}</div>
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Date</div>
        <div>${estimate.date}</div>
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Valid Until</div>
        <div>${estimate.expiryDate}</div>
      </div>
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Prepared for</div>
    <div style="font-weight:600;">${estimate.clientName}</div>
    ${estimate.clientCompany ? `<div style="color:#6b7280;">${estimate.clientCompany}</div>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Description</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Qty</th>
        <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Rate</th>
        <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHtml}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
    <div style="min-width:200px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;color:#6b7280;font-size:14px;">
        <span>Subtotal</span><span>${formatCurrency(estimate.subtotal)}</span>
      </div>
      ${estimate.taxAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;color:#6b7280;font-size:14px;">
        <span>Tax</span><span>${formatCurrency(estimate.taxAmount)}</span>
      </div>` : ""}
      ${estimate.discountAmount > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;color:#6b7280;font-size:14px;">
        <span>Discount</span><span>-${formatCurrency(estimate.discountAmount)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #111;font-weight:700;font-size:16px;">
        <span>Total</span><span>${formatCurrency(estimate.total)}</span>
      </div>
    </div>
  </div>

  ${estimate.notes ? `
  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:8px;">Notes</div>
    <div style="font-size:14px;color:#374151;">${estimate.notes}</div>
  </div>` : ""}

  <div style="text-align:center;margin:32px 0;">
    <a href="${approvalLink}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;">Review &amp; Approve Estimate</a>
  </div>

  <div style="font-size:12px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:16px;">
    This estimate is valid until ${estimate.expiryDate}. Questions? Reply to this email.
  </div>
</body>
</html>`;

    let sent = false;
    let emailError: string | undefined;

    try {
      await sendEmail({
        to: estimate.clientEmail,
        subject: `Estimate ${estimate.number} from CEL3 Interactive`,
        htmlBody,
      });
      sent = true;
    } catch (err) {
      console.error("ESTIMATES_SEND_EMAIL_ERR:", err);
      emailError = err instanceof Error ? err.message : "Email send failed";
    }

    // Update status to "sent" if currently draft
    if (sent && estimate.status === "draft") {
      await sanityWriteClient
        .patch(id)
        .set({ status: "sent", sentAt: new Date().toISOString() })
        .commit();
    }

    if (sent) {
      return NextResponse.json({ sent: true, approvalLink });
    } else {
      return NextResponse.json({ sent: false, approvalLink, error: emailError });
    }
  } catch (err) {
    console.error("ESTIMATES_SEND_ERR:", err);
    return NextResponse.json({ error: "Failed to send estimate" }, { status: 500 });
  }
}
