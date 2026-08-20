import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import ClientSitesClient from "@/components/admin/clientSites/ClientSitesClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminClientSitesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const clients = await sanityServer.fetch(
    `*[_type == "pipelineContact" && (defined(siteUrl) || defined(vercelDomain))] | order(coalesce(company, name) asc) {
      _id, name, company, siteUrl, vercelDomain, vercelProjectId,
      websiteStatus, websiteStatusReason, websiteSuspendedAt, websiteRestoredAt, websiteAutoSuspendExempt
    }`
  );

  return <ClientSitesClient initialClients={clients} />;
}
