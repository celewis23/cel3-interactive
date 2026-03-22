import { getPortalUser } from "@/lib/portal/getPortalUser";
import { getInvoice } from "@/lib/stripe/billing";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-green-500/10 text-green-400" },
  open: { label: "Open", cls: "bg-yellow-500/10 text-yellow-400" },
  void: { label: "Void", cls: "bg-white/5 text-white/30" },
  uncollectible: { label: "Uncollectible", cls: "bg-red-500/10 text-red-400" },
  draft: { label: "Draft", cls: "bg-white/5 text-white/30" },
};

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([getPortalUser(), params]);

  if (!user.stripeCustomerId) notFound();

  const invoice = await getInvoice(id).catch(() => null);
  if (!invoice || invoice.customerId !== user.stripeCustomerId) notFound();

  const badge = STATUS_BADGE[invoice.status ?? "open"] ?? STATUS_BADGE["open"];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/portal/invoices" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Invoices
        </Link>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Invoice</p>
            <h1 className="text-xl font-semibold text-white">{invoice.number ?? invoice.id}</h1>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-white/40 mb-0.5">Date</p>
            <p className="text-white">
              {new Date(invoice.created * 1000).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-xs text-white/40 mb-0.5">Due</p>
              <p className="text-white">
                {new Date(invoice.dueDate * 1000).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Line items */}
        {invoice.lines.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Items</p>
            <div className="flex flex-col gap-2">
              {invoice.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between">
                  <p className="text-sm text-white">{line.description}</p>
                  <p className="text-sm text-white ml-4 flex-shrink-0">{money(line.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-white/8 pt-4 flex flex-col gap-1.5">
          {invoice.subtotal !== invoice.total && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Subtotal</span>
              <span className="text-white">{money(invoice.subtotal)}</span>
            </div>
          )}
          {invoice.tax != null && invoice.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Tax</span>
              <span className="text-white">{money(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold pt-1">
            <span className="text-white">Total</span>
            <span className="text-white">{money(invoice.total)}</span>
          </div>
          {invoice.amountPaid > 0 && invoice.status !== "paid" && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Amount paid</span>
              <span className="text-green-400">{money(invoice.amountPaid)}</span>
            </div>
          )}
          {invoice.status === "open" && (
            <div className="flex justify-between text-base font-semibold pt-1 border-t border-white/8 mt-1">
              <span className="text-yellow-400">Amount due</span>
              <span className="text-yellow-400">{money(invoice.amountDue)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {invoice.hostedInvoiceUrl && invoice.status === "open" && (
            <a
              href={invoice.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
            >
              Pay now →
            </a>
          )}
          {invoice.invoicePdf && (
            <a
              href={invoice.invoicePdf}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
