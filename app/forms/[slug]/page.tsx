import { sanityServer } from "@/lib/sanityServer";
import { Cel3Form } from "@/lib/forms";
import PublicForm from "@/components/forms/PublicForm";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const form = await sanityServer.fetch<Cel3Form | null>(
    `*[_type == "cel3Form" && slug == $slug][0]{ _id, title, description, slug, isPublic, isActive, fields }`,
    { slug }
  );

  if (!form) {
    return <StatusScreen title="Form not found" message="This form does not exist or may have been removed." />;
  }

  if (!form.isPublic) {
    return <StatusScreen title="Not available" message="This form is not available." />;
  }

  if (!form.isActive) {
    return <StatusScreen title="Form closed" message="This form is no longer accepting responses." />;
  }

  return <PublicForm form={form} />;
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-xs text-sky-400 tracking-widest uppercase mb-4">CEL3 Forms</div>
        <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
        <p className="text-sm text-white/40">{message}</p>
        <p className="text-xs text-white/20 mt-8">— CEL3 Interactive</p>
      </div>
    </div>
  );
}
