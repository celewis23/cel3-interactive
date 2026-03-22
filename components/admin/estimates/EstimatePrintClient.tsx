"use client";

type LineItem = {
  _key: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type Estimate = {
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number;
  total: number;
  notes: string | null;
  currency: string;
};

type Props = { estimate: Estimate };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}

export default function EstimatePrintClient({ estimate }: Props) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Print button - hidden when printing */}
      <div className="print:hidden bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Print / Save as PDF
        </button>
        <span className="text-sm text-gray-500">or use your browser&apos;s print dialog</span>
      </div>

      {/* Printable content */}
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="text-2xl font-bold text-gray-900">CEL3 Interactive</div>
            <div className="text-sm text-gray-500 mt-0.5">cel3interactive.com</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">ESTIMATE</div>
            <div className="text-sm text-gray-500 mt-0.5 font-mono">{estimate.number}</div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-6 mb-10 p-5 bg-gray-50 rounded-xl">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date</div>
            <div className="text-sm font-medium">{estimate.date}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Valid Until</div>
            <div className="text-sm font-medium">{estimate.expiryDate}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</div>
            <div className="text-sm font-medium capitalize">{estimate.status}</div>
          </div>
        </div>

        {/* Client info */}
        <div className="mb-10">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Prepared For</div>
          <div className="font-semibold text-gray-900 text-lg">{estimate.clientName}</div>
          {estimate.clientCompany && <div className="text-gray-600">{estimate.clientCompany}</div>}
          {estimate.clientEmail && <div className="text-gray-500 text-sm">{estimate.clientEmail}</div>}
        </div>

        {/* Line items */}
        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 text-left font-semibold text-gray-900">Description</th>
              <th className="py-2 text-center font-semibold text-gray-900 w-16">Qty</th>
              <th className="py-2 text-right font-semibold text-gray-900 w-28">Rate</th>
              <th className="py-2 text-right font-semibold text-gray-900 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item) => (
              <tr key={item._key} className="border-b border-gray-100">
                <td className="py-3 text-gray-800">{item.description}</td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                <td className="py-3 text-right text-gray-900 font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="min-w-[240px] space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(estimate.subtotal)}</span>
            </div>
            {estimate.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({estimate.taxRate}%)</span>
                <span>{formatCurrency(estimate.taxAmount)}</span>
              </div>
            )}
            {estimate.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount{estimate.discountType === "percent" ? ` (${estimate.discountValue}%)` : ""}</span>
                <span>-{formatCurrency(estimate.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t-2 border-gray-900 pt-2">
              <span>Total</span>
              <span>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-gray-50 rounded-xl p-5 mb-8">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          This estimate is valid until {estimate.expiryDate}. CEL3 Interactive &bull; cel3interactive.com
        </div>
      </div>
    </div>
  );
}
