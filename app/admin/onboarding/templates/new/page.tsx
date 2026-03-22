import TemplateBuilder from "@/components/admin/onboarding/TemplateBuilder";

export default function NewOnboardingTemplatePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Onboarding / Templates</div>
        <h1 className="text-2xl font-bold text-white">New Template</h1>
      </div>
      <TemplateBuilder />
    </div>
  );
}
