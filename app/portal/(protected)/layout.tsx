import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityServer } from "@/lib/sanityServer";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProtectedPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) redirect("/portal/auth/login");

  const user = await sanityServer.fetch<{
    _id: string;
    email: string;
    name: string | null;
    company: string | null;
    mustChangePassword: boolean | null;
  } | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, mustChangePassword
    }`,
    { id: session.userId }
  );
  if (!user) redirect("/portal/auth/login");
  if (user.mustChangePassword) redirect("/portal/auth/change-password");

  return <PortalShell user={user}>{children}</PortalShell>;
}
