import { setDomainRedirect, clearDomainRedirect, type VercelResult } from "@/lib/vercel/client";

const MAINTENANCE_PATH = "/site-suspended";

function maintenanceUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";
  return `${base.replace(/\/$/, "")}${MAINTENANCE_PATH}`;
}

/**
 * Reflects a client's websiteStatus onto their live Vercel deployment by
 * setting (or clearing) a platform-level domain redirect — this is what
 * actually puts the site into maintenance mode / blocks admin access,
 * independent of the client's own application code.
 */
export async function syncVercelWebsiteStatus(
  contact: { vercelProjectId?: string | null; vercelDomain?: string | null },
  status: "suspended" | "active"
): Promise<VercelResult> {
  if (!contact.vercelProjectId || !contact.vercelDomain) {
    return { ok: false, error: "Vercel project ID and domain aren't set on this client's contact record" };
  }

  if (status === "suspended") {
    return setDomainRedirect({
      projectId: contact.vercelProjectId,
      domain: contact.vercelDomain,
      redirectTo: maintenanceUrl(),
    });
  }
  return clearDomainRedirect({ projectId: contact.vercelProjectId, domain: contact.vercelDomain });
}
