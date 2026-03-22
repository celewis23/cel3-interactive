import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import EstimateForm from "@/components/admin/estimates/EstimateForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export default async function EstimateDetailPage({ params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;

  const [estimate, contacts] = await Promise.all([
    sanityServer.fetch(`*[_type == "estimate" && _id == $id][0]`, { id }),
    sanityServer.fetch(
      `*[_type == "pipelineContact"] | order(name asc) { _id, name, email, company }`
    ),
  ]);

  if (!estimate) redirect("/admin/estimates");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{estimate.number}</h1>
        <p className="text-sm text-white/40 mt-1">{estimate.clientName}</p>
      </div>
      <EstimateForm estimate={estimate} contacts={contacts} />
    </div>
  );
}
