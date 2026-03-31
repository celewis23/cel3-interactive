import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listCustomers } from "@/lib/stripe/billing";
import { sanityServer } from "@/lib/sanityServer";
import StripeImportClient from "@/components/admin/pipeline/StripeImportClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ImportStripeContactsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [{ customers }, importedContacts] = await Promise.all([
    listCustomers({ limit: 50 }),
    sanityServer.fetch<Array<{ _id: string; name: string; stripeCustomerId: string | null }>>(
      `*[_type == "pipelineContact" && stripeCustomerId != null] | order(name asc) {
        _id, name, stripeCustomerId
      }`
    ),
  ]);

  return <StripeImportClient customers={customers} importedContacts={importedContacts} />;
}
