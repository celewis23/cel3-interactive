import { sanityServer } from "@/lib/sanityServer";
import ContractForm from "@/components/admin/contracts/ContractForm";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const templates = await sanityServer.fetch(
    `*[_type == "contractTemplate"] | order(name asc) { _id, name, category, body, variables }`
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts</div>
        <h1 className="text-2xl font-bold text-white">New Contract</h1>
      </div>
      <ContractForm templates={templates} />
    </div>
  );
}
