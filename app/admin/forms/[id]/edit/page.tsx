import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import Link from "next/link";
import FormBuilderClient from "@/components/admin/forms/FormBuilderClient";
import { Cel3Form } from "@/lib/forms";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await sanityServer.fetch<Cel3Form | null>(
    `*[_type == "cel3Form" && _id == $id][0]`,
    { id }
  );
  if (!form) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/forms" className="text-white/30 hover:text-white transition-colors text-sm">
          ← Forms
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/50">Edit</span>
      </div>
      <FormBuilderClient initial={form} />
    </div>
  );
}
