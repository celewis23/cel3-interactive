import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import AnnouncementsClient from "@/components/admin/announcements/AnnouncementsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AnnouncementsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  // Owner and staff with admin/manager role can post
  const canPost = !session.staffId || ["owner", "admin"].includes(session.roleSlug ?? "");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="text-sm text-white/40 mt-1">Announcements, pinboard, and team communications</p>
      </div>
      <AnnouncementsClient canPost={canPost} currentUserId={session.staffId ?? null} />
    </div>
  );
}
