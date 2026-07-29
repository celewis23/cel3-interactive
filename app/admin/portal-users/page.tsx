import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import PortalUsersClient from "./PortalUsersClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPortalUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const users = await sanityServer.fetch(
    `*[_type == "clientPortalUser"] | order(_createdAt desc) {
      _id, email, name, company, stripeCustomerId, pipelineContactId,
      driveRootFolderId, status, lastLoginAt, invitationSentAt, mustChangePassword, _createdAt,
      siteUrl, managementUrl
    }`
  );

  const clients = await sanityServer.fetch(
    `*[_type == "pipelineContact" && email != null] | order(coalesce(company, name, email) asc) {
      _id, name, email, company, stripeCustomerId,
      siteUrl, managementUrl, portalSiteUrl, portalManagementUrl,
      "portalUserId": *[_type == "clientPortalUser" && pipelineContactId == ^._id][0]._id
    }`
  );

  return <PortalUsersClient initialUsers={users} clientOptions={clients} />;
}
