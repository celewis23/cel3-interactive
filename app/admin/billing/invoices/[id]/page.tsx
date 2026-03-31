import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { getInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import InvoiceActions from "./InvoiceActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-400",
    active: "bg-emerald-500/20 text-emerald-400",
    open: "bg-sky-500/20 text-sky-400",
    draft: "bg-white/10 text-white/40",
    void: "bg-red-500/20 text-red-400",
    uncollectible: "bg-red-500/20 text-red-400",
    past_due: "bg-amber-500/20 text-amber-400",
  };
  const cls = map[status] ?? "bg-white/10 text-white/40";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (invoice) {
    await syncStripeInvoiceToSanity(invoice);
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm mb-4">Invoice not found.</p>
        <Link
          href="/admin/billing/invoices"
          className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin/billing/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-6"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Invoices
      </Link>

      {/* Invoice header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-white">
              {invoice.number ?? "Draft Invoice"}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {fmt(invoice.total, invoice.currency)}
          </div>
          {invoice.amountPaid > 0 && invoice.amountPaid < invoice.total && (
            <div className="text-sm text-white/40 mt-1">
              {fmt(invoice.amountPaid, invoice.currency)} paid &middot;{" "}
              {fmt(invoice.amountDue, invoice.currency)} due
            </div>
          )}
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Customer */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-3">Customer</div>
          <div className="text-sm text-white font-medium">
            {invoice.customerName ?? "—"}
          </div>
          {invoice.customerEmail && (
            <div className="text-sm text-white/50 mt-1">{invoice.customerEmail}</div>
          )}
          <div className="text-xs text-white/25 mt-2 font-mono">{invoice.customerId}</div>
        </div>

        {/* Dates */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-3">Dates</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Created</span>
              <span className="text-white">
                {DateTime.fromSeconds(invoice.created).toFormat("LLL d, yyyy")}
              </span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Due</span>
                <span className="text-white">
                  {DateTime.fromSeconds(invoice.dueDate).toFormat("LLL d, yyyy")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Period</span>
              <span className="text-white text-right">
                {DateTime.fromSeconds(invoice.periodStart).toFormat("LLL d")}
                {" – "}
                {DateTime.fromSeconds(invoice.periodEnd).toFormat("LLL d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {invoice.description && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-6">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Description</div>
          <div className="text-sm text-white">{invoice.description}</div>
        </div>
      )}

      {/* Line items */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-6">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-white/8 text-xs text-white/40 uppercase tracking-wide">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-white/5">
          {invoice.lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-4 items-center"
            >
              <span className="text-sm text-white">{line.description ?? "—"}</span>
              <span className="text-sm text-white/50 text-right">{line.quantity ?? 1}</span>
              <span className="text-sm text-white text-right font-medium">
                {fmt(line.amount, line.currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-white/8 px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Subtotal</span>
            <span className="text-white">{fmt(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.tax !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Tax</span>
              <span className="text-white">{fmt(invoice.tax, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold pt-1 border-t border-white/8">
            <span className="text-white">Total</span>
            <span className="text-white">{fmt(invoice.total, invoice.currency)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">Amount Paid</span>
              <span className="text-emerald-400">{fmt(invoice.amountPaid, invoice.currency)}</span>
            </div>
          )}
          {invoice.amountDue > 0 && invoice.status !== "paid" && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-white/70">Amount Due</span>
              <span className="text-white">{fmt(invoice.amountDue, invoice.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      {(invoice.hostedInvoiceUrl || invoice.invoicePdf) && (
        <div className="flex flex-wrap gap-3">
          {invoice.hostedInvoiceUrl && (
            <a
              href={invoice.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View Invoice
            </a>
          )}
          {invoice.invoicePdf && (
            <a
              href={invoice.invoicePdf}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}
