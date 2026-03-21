import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { listInvoices } from "@/lib/stripe/billing";
import type { BillingInvoice } from "@/lib/stripe/billing";
import Stripe from "stripe";

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
    open: "bg-sky-500/20 text-sky-400",
    draft: "bg-white/10 text-white/40",
    void: "bg-red-500/20 text-red-400",
    uncollectible: "bg-red-500/20 text-red-400",
  };
  const cls = map[status] ?? "bg-white/10 text-white/40";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "Paid", value: "paid" },
  { label: "Draft", value: "draft" },
  { label: "Void", value: "void" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { status } = await searchParams;
  const activeStatus = status ?? "";

  const { invoices, hasMore } = await listInvoices({
    status: activeStatus ? (activeStatus as Stripe.Invoice.Status) : undefined,
    limit: 50,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-white/40 mt-1">All Stripe invoices</p>
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

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/billing/invoices?status=${tab.value}` : "/admin/billing/invoices"}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">
            No {activeStatus || ""} invoices found
          </p>
          <Link
            href="/admin/billing/invoices/new"
            className="inline-flex items-center gap-2 mt-4 text-sky-400 hover:text-sky-300 text-sm transition-colors"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/8 text-xs text-white/40 uppercase tracking-wide">
            <span>Invoice / Customer</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Created</span>
          </div>

          <div className="divide-y divide-white/5">
            {invoices.map((inv: BillingInvoice) => (
              <Link
                key={inv.id}
                href={`/admin/billing/invoices/${inv.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-white/5 transition-colors"
              >
                {/* Invoice / customer */}
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium">
                    {inv.number ?? "Draft"}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5 truncate">
                    {inv.customerName ?? inv.customerEmail ?? inv.customerId}
                    {inv.description ? ` · ${inv.description}` : ""}
                  </div>
                  {inv.dueDate && (
                    <div className="text-xs text-white/25 mt-0.5">
                      Due {DateTime.fromSeconds(inv.dueDate).toFormat("LLL d, yyyy")}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className="text-sm font-medium text-white text-right">
                  {fmt(inv.amountDue, inv.currency)}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={inv.status} />
                </div>

                {/* Created */}
                <div className="text-xs text-white/40 whitespace-nowrap">
                  {DateTime.fromSeconds(inv.created).toFormat("LLL d, yyyy")}
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-3 border-t border-white/8 text-center text-xs text-white/30">
              Showing first 50 results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
