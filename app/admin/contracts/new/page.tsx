import ContractForm from "@/components/admin/contracts/ContractForm";
import { ensureDefaultContractTemplates } from "@/lib/contracts/defaultTemplates";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const templates = await ensureDefaultContractTemplates();

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
