import SiteLaunchClient from "@/components/shared/SiteLaunchClient";
import { getPortalUser } from "@/lib/portal/getPortalUser";
import { getManagementLaunchDetails } from "@/lib/siteAccess";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalManageSitePage() {
  const user = await getPortalUser();

  const [portalUser, pipelineContact] = await Promise.all([
    sanityServer.fetch<{
      name: string | null;
      siteUrl: string | null;
      managementUrl: string | null;
      managementUsername: string | null;
      managementPasswordEncrypted: string | null;
      managementPasswordIv: string | null;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{
        name, siteUrl, managementUrl, managementUsername, managementPasswordEncrypted, managementPasswordIv
      }`,
      { id: user._id }
    ),
    user.pipelineContactId
      ? sanityServer.fetch<{
          name: string;
          siteUrl: string | null;
          managementUrl: string | null;
          managementUsername: string | null;
          managementPasswordEncrypted: string | null;
          managementPasswordIv: string | null;
        } | null>(
          `*[_type == "pipelineContact" && _id == $id][0]{
            name, siteUrl, managementUrl, managementUsername, managementPasswordEncrypted, managementPasswordIv
          }`,
          { id: user.pipelineContactId }
        )
      : Promise.resolve(null),
  ]);

  const details = getManagementLaunchDetails({
    siteUrl: pipelineContact?.siteUrl ?? portalUser?.siteUrl ?? null,
    managementUrl: pipelineContact?.managementUrl ?? portalUser?.managementUrl ?? null,
    managementUsername: pipelineContact?.managementUsername ?? portalUser?.managementUsername ?? null,
    managementPasswordEncrypted:
      pipelineContact?.managementPasswordEncrypted ?? portalUser?.managementPasswordEncrypted ?? null,
    managementPasswordIv: pipelineContact?.managementPasswordIv ?? portalUser?.managementPasswordIv ?? null,
  });

  return (
    <SiteLaunchClient
      title={pipelineContact?.name ?? portalUser?.name ?? user.company ?? "Manage Site"}
      siteUrl={details.siteUrl}
      managementUrl={details.managementUrl}
      loginAction={details.loginAction ?? null}
      username={details.managementUsername}
      password={details.managementPassword}
      isWordPress={details.isWordPress}
      homeHref="/portal/settings"
    />
  );
}
