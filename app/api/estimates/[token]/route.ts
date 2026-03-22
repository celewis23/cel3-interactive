import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendEmail } from "@/lib/gmail/api";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

type EstimateDoc = {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  lineItems: Array<{ _key: string; description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  viewedAt: string | null;
};

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const estimate = await sanityServer.fetch<EstimateDoc | null>(
      `*[_type == "estimate" && approvalToken == $token][0]{
        _id, number, date, expiryDate, status,
        clientName, clientCompany,
        lineItems, subtotal, taxAmount, discountAmount, total, currency,
        notes, approvedAt, declinedAt, viewedAt, clientEmail
      }`,
      { token } as Record<string, string>
    );

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mark as viewed on first open
    if (estimate.status === "sent") {
      await sanityWriteClient
        .patch(estimate._id)
        .set({ status: "viewed", viewedAt: new Date().toISOString() })
        .commit();
      estimate.status = "viewed";
      estimate.viewedAt = new Date().toISOString();
    }

    const safe = {
      number: estimate.number,
      date: estimate.date,
      expiryDate: estimate.expiryDate,
      status: estimate.status,
      clientName: estimate.clientName,
      clientCompany: estimate.clientCompany,
      lineItems: estimate.lineItems,
      subtotal: estimate.subtotal,
      taxAmount: estimate.taxAmount,
      discountAmount: estimate.discountAmount,
      total: estimate.total,
      currency: estimate.currency,
      notes: estimate.notes,
      approvedAt: estimate.approvedAt,
      declinedAt: estimate.declinedAt,
    };

    return NextResponse.json(safe);
  } catch (err) {
    console.error("PUBLIC_ESTIMATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch estimate" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const body = await req.json();
    const action: "approve" | "decline" = body.action;

    if (action !== "approve" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const estimate = await sanityServer.fetch<{ _id: string; status: string; number: string; clientName: string } | null>(
      `*[_type == "estimate" && approvalToken == $token][0]{ _id, status, number, clientName }`,
      { token } as Record<string, string>
    );

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date().toISOString();
    let patch: Record<string, string> = {};

    if (action === "approve") {
      patch = { status: "approved", approvedAt: now };
    } else {
      patch = { status: "declined", declinedAt: now };
    }

    await sanityWriteClient.patch(estimate._id).set(patch).commit();

    // Notify admin (best effort)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const verb = action === "approve" ? "approved" : "declined";
      sendEmail({
        to: adminEmail,
        subject: `Estimate ${estimate.number} ${verb} by ${estimate.clientName}`,
        htmlBody: `<p>${estimate.clientName} has <strong>${verb}</strong> estimate <strong>${estimate.number}</strong>.</p>`,
      }).catch((err) => console.error("ESTIMATE_NOTIFY_ADMIN_ERR:", err));
    }

    return NextResponse.json({ status: patch.status });
  } catch (err) {
    console.error("PUBLIC_ESTIMATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
