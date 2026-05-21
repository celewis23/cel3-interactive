import type { PortalUser } from "@/lib/portal/getPortalUser";

export function getPortalProjectQueryParams(user: Pick<PortalUser, "_id" | "email" | "stripeCustomerId" | "pipelineContactId">) {
  return {
    portalUserId: user._id,
    email: user.email.toLowerCase(),
    stripeCustomerId: user.stripeCustomerId ?? "__none__",
    pipelineContactId: user.pipelineContactId ?? "__none__",
    refs: [user.stripeCustomerId, user.pipelineContactId].filter(Boolean),
  };
}

export const PORTAL_PROJECT_ACCESS_FILTER = `(
  portalUserId == $portalUserId ||
  lower(clientEmail) == $email ||
  pipelineContactId == $pipelineContactId ||
  stripeCustomerId == $stripeCustomerId ||
  clientRef in $refs
)`;
