import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";
import ContractList from "@/components/admin/contracts/ContractList";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await sanityServer.fetch(
    `*[_type == "contract"] | order(_createdAt desc) {
      _id, number, date, expiryDate, status, clientName, clientEmail,
      clientCompany, templateName, category, signerName, sentAt, viewedAt,
      signedAt, declinedAt, _createdAt
    }`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Backoffice</div>
          <h1 className="text-2xl font-bold text-white">Contracts</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/contracts/templates"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/admin/contracts/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            New Contract
          </Link>
        </div>
      </div>
      <ContractList contracts={contracts} />
    </div>
  );
}
