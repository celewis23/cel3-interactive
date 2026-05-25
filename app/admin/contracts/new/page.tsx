import ContractForm from "@/components/admin/contracts/ContractForm";
import { ensureDefaultContractTemplates } from "@/lib/contracts/defaultTemplates";
import { sanityServer } from "@/lib/sanityServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ContractClientOption = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  portalUserId: string | null;
};

export default async function NewContractPage() {
  const [templates, clients] = await Promise.all([
    ensureDefaultContractTemplates(),
    sanityServer.fetch<ContractClientOption[]>(
      `*[_type == "pipelineContact"] | order(coalesce(company, name, email) asc) {
        _id, name, email, company, stripeCustomerId,
        "portalUserId": *[_type == "clientPortalUser" && pipelineContactId == ^._id][0]._id
      }`
    ),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts</div>
        <h1 className="text-2xl font-bold text-white">New Contract</h1>
      </div>
      <ContractForm templates={templates} clients={clients} />
    </div>
  );
}
