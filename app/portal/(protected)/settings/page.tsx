import PortalSettingsClient from "@/components/portal/PortalSettingsClient";
import { getPortalUser } from "@/lib/portal/getPortalUser";
import { getPortalProfile } from "@/lib/portal/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalSettingsPage() {
  const user = await getPortalUser();
  const profile = await getPortalProfile(user._id);
  if (!profile) return null;
  return <PortalSettingsClient initialProfile={profile} />;
}
