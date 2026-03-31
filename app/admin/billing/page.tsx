import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  getBalance,
  listPayouts,
  listCustomers,
  listInvoices,
  listSubscriptions,
} from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function statusBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-400",
    active: "bg-emerald-500/20 text-emerald-400",
    open: "bg-sky-500/20 text-sky-400",
    draft: "bg-white/10 text-white/40",
    void: "bg-red-500/20 text-red-400",
    canceled: "bg-red-500/20 text-red-400",
    past_due: "bg-amber-500/20 text-amber-400",
    trialing: "bg-sky-500/20 text-sky-400",
    unpaid: "bg-amber-500/20 text-amber-400",
    incomplete: "bg-amber-500/20 text-amber-400",
  };
  const cls = map[status] ?? "bg-white/10 text-white/40";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

export default async function BillingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [balance, payouts, customersResult, invoicesResult, subscriptionsResult] =
    await Promise.all([
      getBalance(),
      listPayouts(6),
      listCustomers({ limit: 5 }),
      listInvoices({ limit: 5, status: "open" as any }),
      listSubscriptions({ limit: 3 }),
    ]);
  await Promise.all(invoicesResult.invoices.map((invoice) => syncStripeInvoiceToSanity(invoice)));

  // Sum available by currency (USD primary)
  const availableUsd =
    balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const pendingUsd =
    balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;
  const availableOther = balance.available.filter((b) => b.currency !== "usd");
  const pendingOther = balance.pending.filter((b) => b.currency !== "usd");

  const openInvoicesTotal = invoicesResult.invoices.reduce(
    (sum, inv) => sum + inv.amountDue,
    0
  );

  const activeSubCount = subscriptionsResult.subscriptions.filter(
    (s) => s.status === "active"
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Billing</h1>
          <p className="text-sm text-white/40 mt-1">Stripe billing management</p>
        </div>
        <Link
          href="/admin/billing/invoices/new"
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Invoice
        </Link>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Available Balance</div>
          <div className="text-2xl font-semibold text-white">{fmt(availableUsd)}</div>
          {availableOther.map((b) => (
            <div key={b.currency} className="text-sm text-white/40 mt-1">
              {fmt(b.amount, b.currency)} {b.currency.toUpperCase()}
            </div>
          ))}
          {balance.livemode ? (
            <div className="mt-3 text-xs text-emerald-400">Live mode</div>
          ) : (
            <div className="mt-3 text-xs text-amber-400">Test mode</div>
          )}
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Pending Balance</div>
          <div className="text-2xl font-semibold text-white">{fmt(pendingUsd)}</div>
          {pendingOther.map((b) => (
            <div key={b.currency} className="text-sm text-white/40 mt-1">
              {fmt(b.amount, b.currency)} {b.currency.toUpperCase()}
            </div>
          ))}
          <div className="mt-3 text-xs text-white/25">Processing payouts</div>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Open Invoices</div>
          <div className="text-2xl font-semibold text-white">{fmt(openInvoicesTotal)}</div>
          <div className="mt-1 text-sm text-white/40">
            {invoicesResult.invoices.length} invoice{invoicesResult.invoices.length !== 1 ? "s" : ""} outstanding
          </div>
          <div className="mt-3 text-xs text-white/25">
            {activeSubCount} active subscription{activeSubCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      {payouts.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Recent Payouts</h2>
          </div>
          <div className="divide-y divide-white/5">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between py-2.5 gap-4">
                <div>
                  <div className="text-sm text-white">
                    {payout.description ?? payout.id}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    Arrival: {DateTime.fromSeconds(payout.arrivalDate).toFormat("LLL d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(payout.status)}
                  <span className="text-sm font-medium text-white">
                    {fmt(payout.amount, payout.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Open Invoices */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Open Invoices</h2>
            <Link
              href="/admin/billing/invoices?status=open"
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              View all
            </Link>
          </div>
          {invoicesResult.invoices.length === 0 ? (
            <p className="text-sm text-white/25 py-4 text-center">No open invoices</p>
          ) : (
            <div className="divide-y divide-white/5">
              {invoicesResult.invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/admin/billing/invoices/${inv.id}`}
                  className="flex items-center justify-between py-3 gap-4 hover:bg-white/3 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {inv.customerName ?? inv.customerEmail ?? inv.customerId}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {inv.number ?? "Draft"}{inv.dueDate ? ` · Due ${DateTime.fromSeconds(inv.dueDate).toFormat("LLL d")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(inv.status)}
                    <span className="text-sm font-medium text-white">
                      {fmt(inv.amountDue, inv.currency)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Recent Customers</h2>
            <Link
              href="/admin/billing/customers"
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              View all
            </Link>
          </div>
          {customersResult.customers.length === 0 ? (
            <p className="text-sm text-white/25 py-4 text-center">No customers yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {customersResult.customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {c.name ?? c.email ?? c.id}
                    </div>
                    {c.name && c.email && (
                      <div className="text-xs text-white/40 mt-0.5 truncate">{c.email}</div>
                    )}
                    <div className="text-xs text-white/25 mt-0.5">
                      {DateTime.fromSeconds(c.created).toFormat("LLL d, yyyy")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.balance !== 0 && (
                      <div className={`text-sm font-medium ${c.balance < 0 ? "text-emerald-400" : "text-amber-400"}`}>
                        {c.balance < 0 ? `Credit: ${fmt(Math.abs(c.balance), c.currency)}` : fmt(c.balance, c.currency)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/billing/invoices"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            All Invoices
          </Link>
          <Link
            href="/admin/billing/customers"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            All Customers
          </Link>
          <Link
            href="/admin/billing/subscriptions"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Subscriptions
          </Link>
          <Link
            href="/admin/billing/invoices/new"
            className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/30 text-sky-400 text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Invoice
          </Link>
        </div>
      </div>
    </div>
  );
}
