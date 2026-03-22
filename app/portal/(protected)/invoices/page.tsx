import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listInvoices } from "@/lib/stripe/billing";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-green-500/10 text-green-400" },
  open: { label: "Open", cls: "bg-yellow-500/10 text-yellow-400" },
  void: { label: "Void", cls: "bg-white/5 text-white/30" },
  uncollectible: { label: "Uncollectible", cls: "bg-red-500/10 text-red-400" },
  draft: { label: "Draft", cls: "bg-white/5 text-white/30" },
};

export default async function PortalInvoicesPage() {
  const user = await getPortalUser();

  if (!user.stripeCustomerId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-white/40 mt-1">Your billing history</p>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No billing account linked yet. Contact us to get set up.</p>
        </div>
      </div>
    );
  }

  const [paid, open] = await Promise.all([
    listInvoices({ customerId: user.stripeCustomerId, status: "paid", limit: 50 }).catch(() => ({ invoices: [] })),
    listInvoices({ customerId: user.stripeCustomerId, status: "open", limit: 50 }).catch(() => ({ invoices: [] })),
  ]);

  const invoices = [...open.invoices, ...paid.invoices].sort((a, b) => b.created - a.created);
  const outstandingTotal = open.invoices.reduce((s, i) => s + i.amountDue, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-white/40 mt-1">{invoices.length} total</p>
        </div>
        {outstandingTotal > 0 && (
          <div className="text-right">
            <p className="text-xs text-white/40">Outstanding balance</p>
            <p className="text-xl font-semibold text-yellow-400">{money(outstandingTotal)}</p>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No invoices yet.</p>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Invoice</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Status</th>
                <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Amount</th>
                <th className="px-4 py-3 text-right text-xs text-white/40 font-medium hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => {
                const s = STATUS_LABEL[inv.status ?? "open"] ?? STATUS_LABEL["open"];
                return (
                  <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/portal/invoices/${inv.id}`} className="text-sm text-white hover:text-sky-400 transition-colors">
                        {inv.number ?? inv.id.slice(0, 12)}
                      </Link>
                      {inv.description && (
                        <p className="text-xs text-white/30 truncate max-w-[200px]">{inv.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-white/60">
                        {new Date(inv.created * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm text-white font-medium">{money(inv.amountDue || inv.amountPaid)}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        {inv.hostedInvoiceUrl && inv.status === "open" && (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold transition-colors"
                          >
                            Pay now
                          </a>
                        )}
                        {inv.invoicePdf && (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-white/40 hover:text-white transition-colors"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
