import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityServer } from "@/lib/sanityServer";

export type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  status: string;
  mustChangePassword?: boolean | null;
  siteUrl?: string | null;
  managementUrl?: string | null;
};

export async function getPortalUser(): Promise<PortalUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) redirect("/portal/auth/login");

  const user = await sanityServer.fetch<PortalUser | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, stripeCustomerId, pipelineContactId, driveRootFolderId, status, mustChangePassword,
      siteUrl, managementUrl
    }`,
    { id: session.userId }
  );
  if (!user) redirect("/portal/auth/login");
  if (user.mustChangePassword) redirect("/portal/auth/change-password");
  return user;
}
