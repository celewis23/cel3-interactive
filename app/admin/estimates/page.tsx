import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";
import EstimateList from "@/components/admin/estimates/EstimateList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Estimate = {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  total: number;
  approvedAt: string | null;
  _createdAt: string;
};

export default async function EstimatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const estimates = await sanityServer.fetch<Estimate[]>(
    `*[_type == "estimate"] | order(_createdAt desc)`
  );

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const pendingValue = estimates
    .filter((e) => ["draft", "sent", "viewed"].includes(e.status))
    .reduce((s, e) => s + (e.total || 0), 0);

  const approvedThisMonth = estimates.filter(
    (e) => e.status === "approved" && e.approvedAt && e.approvedAt >= thisMonthStart
  );
  const approvedThisMonthValue = approvedThisMonth.reduce((s, e) => s + (e.total || 0), 0);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Estimates</h1>
          <p className="text-sm text-white/40 mt-1">{estimates.length} total estimate{estimates.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/estimates/new"
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
        >
          + New Estimate
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/50 mb-1.5">Pending value</div>
          <div className="text-2xl font-semibold text-white">{formatCurrency(pendingValue)}</div>
          <div className="text-xs text-white/30 mt-1">draft + sent + viewed</div>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="text-xs text-white/50 mb-1.5">Approved this month</div>
          <div className="text-2xl font-semibold text-green-400">{formatCurrency(approvedThisMonthValue)}</div>
          <div className="text-xs text-white/30 mt-1">{approvedThisMonth.length} estimate{approvedThisMonth.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <EstimateList initialEstimates={estimates} />
    </div>
  );
}
