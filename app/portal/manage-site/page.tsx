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
          portalSiteUrl: string | null;
          portalManagementUrl: string | null;
          portalManagementUsername: string | null;
          portalManagementPasswordEncrypted: string | null;
          portalManagementPasswordIv: string | null;
          websiteStatus: string | null;
        } | null>(
          `*[_type == "pipelineContact" && _id == $id][0]{
            name, siteUrl, managementUrl,
            portalSiteUrl, portalManagementUrl, portalManagementUsername,
            portalManagementPasswordEncrypted, portalManagementPasswordIv,
            websiteStatus
          }`,
          { id: user.pipelineContactId }
        )
      : Promise.resolve(null),
  ]);

  if (pipelineContact?.websiteStatus === "suspended") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-white">Manage Site</h1>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
          <p className="text-sm text-amber-300">
            Site management is temporarily unavailable for your account. Please contact us to resolve this, or
            visit <a href="/portal/invoices" className="underline hover:text-amber-200">Invoices</a> to review and pay any outstanding balance.
          </p>
        </div>
      </div>
    );
  }

  const details = getManagementLaunchDetails({
    siteUrl: portalUser?.siteUrl ?? pipelineContact?.portalSiteUrl ?? pipelineContact?.siteUrl ?? null,
    managementUrl: portalUser?.managementUrl ?? pipelineContact?.portalManagementUrl ?? pipelineContact?.managementUrl ?? null,
    managementUsername: portalUser?.managementUsername ?? pipelineContact?.portalManagementUsername ?? null,
    managementPasswordEncrypted: portalUser?.managementPasswordEncrypted ?? pipelineContact?.portalManagementPasswordEncrypted ?? null,
    managementPasswordIv: portalUser?.managementPasswordIv ?? pipelineContact?.portalManagementPasswordIv ?? null,
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
