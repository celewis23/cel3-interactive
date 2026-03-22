"use client";

import { useState } from "react";

type LineItem = {
  _key: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type SafeEstimate = {
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientCompany: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
};

type Props = {
  estimate: SafeEstimate;
  token: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}

export default function EstimateApprovalClient({ estimate, token }: Props) {
  const [status, setStatus] = useState(estimate.status);
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "decline") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/estimates/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setStatus(data.status);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const isActionable = status === "sent" || status === "viewed";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="text-2xl font-bold text-gray-900 mb-1">CEL3 Interactive</div>
        <div className="text-sm text-gray-500">Estimate</div>
      </div>

      {/* Status banner for already-acted estimates */}
      {status === "approved" && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm font-medium">
          This estimate was approved{estimate.approvedAt ? ` on ${new Date(estimate.approvedAt).toLocaleDateString()}` : ""}. Thank you!
        </div>
      )}
      {status === "declined" && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm font-medium">
          This estimate was declined{estimate.declinedAt ? ` on ${new Date(estimate.declinedAt).toLocaleDateString()}` : ""}.
        </div>
      )}
      {status === "expired" && (
        <div className="mb-6 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl p-4 text-sm">
          This estimate has expired.
        </div>
      )}

      {/* Estimate meta */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6 flex flex-wrap gap-6">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estimate #</div>
          <div className="font-semibold text-gray-900">{estimate.number}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</div>
          <div className="text-gray-900">{estimate.date}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valid Until</div>
          <div className="text-gray-900">{estimate.expiryDate}</div>
        </div>
      </div>

      {/* Client */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Prepared for</div>
        <div className="font-semibold text-gray-900">{estimate.clientName}</div>
        {estimate.clientCompany && <div className="text-gray-500 text-sm">{estimate.clientCompany}</div>}
      </div>

      {/* Line items */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wide font-medium">Description</th>
              <th className="px-4 py-2 text-center text-xs text-gray-500 uppercase tracking-wide font-medium">Qty</th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase tracking-wide font-medium">Rate</th>
              <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase tracking-wide font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item) => (
              <tr key={item._key} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-900">{item.description}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="min-w-[220px] space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(estimate.subtotal)}</span>
          </div>
          {estimate.taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(estimate.taxAmount)}</span>
            </div>
          )}
          {estimate.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Discount</span>
              <span>-{formatCurrency(estimate.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
            <span>Total</span>
            <span>{formatCurrency(estimate.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {estimate.notes && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
      )}

      {/* Action buttons */}
      {isActionable && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => handleAction("approve")}
            disabled={loading !== null}
            className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {loading === "approve" ? "Processing..." : "Approve Estimate"}
          </button>
          <button
            onClick={() => handleAction("decline")}
            disabled={loading !== null}
            className="px-6 py-3 rounded-xl border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-500 text-sm transition-colors"
          >
            {loading === "decline" ? "Processing..." : "Decline"}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 text-center text-xs text-gray-400">
        This estimate is valid until {estimate.expiryDate}.
      </div>
    </div>
  );
}
