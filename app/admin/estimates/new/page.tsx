import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import EstimateForm from "@/components/admin/estimates/EstimateForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Contact = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
};

export default async function NewEstimatePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const contacts = await sanityServer.fetch<Contact[]>(
    `*[_type == "pipelineContact"] | order(name asc) { _id, name, email, company }`
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Estimate</h1>
        <p className="text-sm text-white/40 mt-1">Create a new estimate for a client</p>
      </div>
      <EstimateForm contacts={contacts} />
    </div>
  );
}
