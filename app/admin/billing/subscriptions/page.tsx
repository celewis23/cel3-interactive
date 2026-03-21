import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { listSubscriptions } from "@/lib/stripe/billing";
import type { BillingSubscription } from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    trialing: "bg-sky-500/20 text-sky-400",
    past_due: "bg-amber-500/20 text-amber-400",
    canceled: "bg-red-500/20 text-red-400",
    incomplete: "bg-amber-500/20 text-amber-400",
    incomplete_expired: "bg-red-500/20 text-red-400",
    unpaid: "bg-amber-500/20 text-amber-400",
    paused: "bg-white/10 text-white/40",
  };
  const cls = map[status] ?? "bg-white/10 text-white/40";
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

export default async function SubscriptionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { subscriptions, hasMore } = await listSubscriptions({ limit: 20 });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
        <p className="text-sm text-white/40 mt-1">All Stripe subscriptions</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub: BillingSubscription) => (
            <div
              key={sub.id}
              className="bg-white/3 border border-white/8 hover:border-white/15 rounded-2xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Customer + plan info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {sub.customerName ?? sub.customerEmail ?? sub.customerId}
                    </span>
                    <StatusBadge status={sub.status} />
                    {sub.cancelAtPeriodEnd && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        cancels at period end
                      </span>
                    )}
                  </div>
                  {sub.customerName && sub.customerEmail && (
                    <div className="text-xs text-white/40 mb-2">{sub.customerEmail}</div>
                  )}

                  {/* Plan items */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sub.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1"
                      >
                        <span className="text-xs text-white/70">
                          {item.productName ?? item.priceId}
                        </span>
                        <span className="text-xs text-white/30">·</span>
                        <span className="text-xs text-white font-medium">
                          {fmt(item.amount, item.currency)}/{item.interval}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="text-right shrink-0">
                  <div className="text-xs text-white/40 mb-1">Current period</div>
                  <div className="text-xs text-white/60">
                    {DateTime.fromSeconds(sub.currentPeriodStart).toFormat("LLL d")}
                    {" – "}
                    {DateTime.fromSeconds(sub.currentPeriodEnd).toFormat("LLL d, yyyy")}
                  </div>
                  {sub.canceledAt && (
                    <div className="text-xs text-red-400 mt-1">
                      Canceled {DateTime.fromSeconds(sub.canceledAt).toFormat("LLL d, yyyy")}
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription ID */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-xs text-white/20 font-mono">{sub.id}</span>
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-xs text-white/30 hover:text-sky-400 transition-colors"
                >
                  View in Stripe
                </a>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center text-xs text-white/30 py-2">
              Showing first 20 subscriptions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
