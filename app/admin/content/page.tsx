import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { sanityServer } from "@/lib/sanityServer";
import ContentEditor from "./ContentEditor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ContentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const settings = await sanityServer.fetch(`*[_id == "siteSettings"][0]`);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Site Content</h1>
        <p className="text-sm text-white/40 mt-1">Edit copy for homepage sections</p>
      </div>
      <ContentEditor initial={settings || {}} />
    </div>
  );
}
