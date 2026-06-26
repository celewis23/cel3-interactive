import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { listSubscriptions } from "@/lib/stripe/billing";
import SubscriptionManager from "@/components/admin/billing/SubscriptionManager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SubscriptionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { subscriptions, hasMore } = await listSubscriptions({ limit: 20 });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-white/40">
          Create and manage recurring invoices, auto-pay subscriptions, billing dates, amounts,
          and payment frequency.
        </p>
      </div>

      <SubscriptionManager subscriptions={subscriptions} hasMore={hasMore} />
    </div>
  );
}
