import { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityServer } from "@/lib/sanityServer";

export type MessagingActor =
  | {
      kind: "admin";
      actorId: string;
      userId: string | null;
      name: string;
      email: string;
      roleSlug: string;
      isOwner: boolean;
      avatarUrl: string | null;
    }
  | {
      kind: "client";
      actorId: string;
      userId: string;
      name: string;
      email: string;
      company: string | null;
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
      avatarUrl: string | null;
    };

type StaffRecord = {
  _id: string;
  name: string;
  email: string;
  status: string;
  roleSlug: string;
  profileImageUrl?: string | null;
};

type PortalRecord = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  profileImageUrl?: string | null;
  status: string;
};

export async function getMessagingActor(req: NextRequest): Promise<MessagingActor | null> {
  const adminToken = req.cookies.get(COOKIE_NAME)?.value;
  const adminSession = adminToken ? verifySessionToken(adminToken) : null;
  if (adminSession?.step === "full") {
    if (!adminSession.staffId) {
      const ownerProfile = await sanityServer.fetch<{ ownerName?: string | null; ownerProfileImageUrl?: string | null } | null>(
        `*[_id == "siteSettings"][0]{ ownerName, ownerProfileImageUrl }`
      ).catch(() => null);
      return {
        kind: "admin",
        actorId: "admin:owner",
        userId: null,
        name: ownerProfile?.ownerName ?? "Owner",
        email: process.env.ADMIN_USERNAME ?? "owner",
        roleSlug: "owner",
        isOwner: true,
        avatarUrl: ownerProfile?.ownerProfileImageUrl ?? null,
      };
    }

    const staff = await sanityServer.fetch<StaffRecord | null>(
      `*[_type == "staffMember" && _id == $id][0]{ _id, name, email, status, roleSlug, profileImageUrl }`,
      { id: adminSession.staffId }
    );
    if (!staff || staff.status !== "active") return null;

    return {
      kind: "admin",
      actorId: `admin:${staff._id}`,
      userId: staff._id,
      name: staff.name,
      email: staff.email,
      roleSlug: staff.roleSlug,
      isOwner: false,
      avatarUrl: staff.profileImageUrl ?? null,
    };
  }

  const portalToken = req.cookies.get(PORTAL_COOKIE)?.value;
  const portalSession = portalToken ? verifyPortalSessionToken(portalToken) : null;
  if (!portalSession) return null;

  const user = await sanityServer.fetch<PortalRecord | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, stripeCustomerId, pipelineContactId, profileImageUrl, status
    }`,
    { id: portalSession.userId }
  );
  if (!user) return null;

  return {
    kind: "client",
    actorId: `portal:${user._id}`,
    userId: user._id,
    name: user.name ?? user.company ?? user.email,
    email: user.email,
    company: user.company,
    stripeCustomerId: user.stripeCustomerId,
    pipelineContactId: user.pipelineContactId,
    avatarUrl: user.profileImageUrl ?? null,
  };
}
