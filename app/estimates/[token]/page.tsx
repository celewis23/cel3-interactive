import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import EstimateApprovalClient from "@/components/admin/estimates/EstimateApprovalClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

type SafeEstimate = {
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
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
};

export default async function EstimatePublicPage({ params }: Params) {
  const { token } = await params;

  const estimate = await sanityServer.fetch<(SafeEstimate & { _id: string }) | null>(
    `*[_type == "estimate" && approvalToken == $token][0]{
      _id, number, date, expiryDate, status,
      clientName, clientCompany,
      lineItems, subtotal, taxAmount, discountAmount, total, currency,
      notes, approvedAt, declinedAt
    }`,
    { token } as Record<string, string>
  );

  if (!estimate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">404</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Estimate not found</h1>
          <p className="text-gray-500">This estimate may have expired or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Mark as viewed (first open)
  if (estimate.status === "sent") {
    await sanityWriteClient
      .patch(estimate._id)
      .set({ status: "viewed", viewedAt: new Date().toISOString() })
      .commit();
    estimate.status = "viewed";
  }

  const safeEstimate: SafeEstimate = {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <EstimateApprovalClient estimate={safeEstimate} token={token} />
    </div>
  );
}
