import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import TemplateForm from "@/components/admin/contracts/TemplateForm";

export const dynamic = "force-dynamic";

export default async function EditContractTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await sanityServer.fetch(
    `*[_type == "contractTemplate" && _id == $id][0]`,
    { id }
  ) as { _id: string; name: string; category: string; body: string; variables: string[] } | null;

  if (!template) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts / Templates</div>
        <h1 className="text-2xl font-bold text-white">{template.name}</h1>
      </div>
      <TemplateForm initial={template} />
    </div>
  );
}
