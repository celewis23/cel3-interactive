import TemplateForm from "@/components/admin/contracts/TemplateForm";

export default function NewContractTemplatePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts / Templates</div>
        <h1 className="text-2xl font-bold text-white">New Template</h1>
      </div>
      <TemplateForm />
    </div>
  );
}
