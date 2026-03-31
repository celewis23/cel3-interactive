import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import SiteLaunchClient from "@/components/shared/SiteLaunchClient";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { getManagementLaunchDetails } from "@/lib/siteAccess";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminManageSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;
  const contact = await sanityServer.fetch<{
    _id: string;
    name: string;
    siteUrl: string | null;
    managementUrl: string | null;
    managementUsername: string | null;
    managementPasswordEncrypted: string | null;
    managementPasswordIv: string | null;
  } | null>(
    `*[_type == "pipelineContact" && _id == $id][0]{
      _id, name, siteUrl, managementUrl, managementUsername, managementPasswordEncrypted, managementPasswordIv
    }`,
    { id }
  );

  if (!contact) notFound();

  const details = getManagementLaunchDetails(contact);

  return (
    <SiteLaunchClient
      title={contact.name}
      siteUrl={details.siteUrl}
      managementUrl={details.managementUrl}
      loginAction={details.loginAction ?? null}
      username={details.managementUsername}
      password={details.managementPassword}
      isWordPress={details.isWordPress}
      homeHref={`/admin/pipeline/contacts/${contact._id}`}
    />
  );
}
