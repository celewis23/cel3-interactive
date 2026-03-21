import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { listCustomers } from "@/lib/stripe/billing";
import type { BillingCustomer } from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { customers, hasMore } = await listCustomers({ limit: 20 });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Customers</h1>
        <p className="text-sm text-white/40 mt-1">All Stripe customers</p>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">No customers found</p>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/8 text-xs text-white/40 uppercase tracking-wide">
            <span>Customer</span>
            <span className="text-right">Balance</span>
            <span className="text-center">Subs</span>
            <span className="text-center">Invoices</span>
            <span>Created</span>
          </div>

          <div className="divide-y divide-white/5">
            {customers.map((c: BillingCustomer) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-white/2 transition-colors"
              >
                {/* Customer info */}
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">
                    {c.name ?? c.email ?? c.id}
                  </div>
                  {c.name && c.email && (
                    <div className="text-xs text-white/40 mt-0.5 truncate">{c.email}</div>
                  )}
                  <div className="text-xs text-white/20 mt-0.5 font-mono">{c.id}</div>
                </div>

                {/* Balance */}
                <div className="text-sm text-right">
                  {c.balance === 0 ? (
                    <span className="text-white/25">—</span>
                  ) : c.balance < 0 ? (
                    <span className="text-emerald-400">
                      Credit: {fmt(Math.abs(c.balance), c.currency)}
                    </span>
                  ) : (
                    <span className="text-amber-400">{fmt(c.balance, c.currency)}</span>
                  )}
                </div>

                {/* Subscriptions */}
                <div className="text-sm text-white/50 text-center">
                  {c.subscriptionCount ?? 0}
                </div>

                {/* Invoices */}
                <div className="text-sm text-white/50 text-center">
                  {c.invoiceCount ?? 0}
                </div>

                {/* Created + link */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 whitespace-nowrap">
                    {DateTime.fromSeconds(c.created).toFormat("LLL d, yyyy")}
                  </span>
                  <a
                    href={`https://dashboard.stripe.com/customers/${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/30 hover:text-sky-400 transition-colors"
                    title="Open in Stripe dashboard"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-3 border-t border-white/8 text-center text-xs text-white/30">
              Showing first 20 customers
            </div>
          )}
        </div>
      )}
    </div>
  );
}
