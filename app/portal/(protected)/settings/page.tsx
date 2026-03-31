import { getPortalUser } from "@/lib/portal/getPortalUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalSettingsPage() {
  const user = await getPortalUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Your portal account details and access information.</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-white/35 mb-1">Name</p>
            <p className="text-sm text-white">{user.name ?? "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs text-white/35 mb-1">Company</p>
            <p className="text-sm text-white">{user.company ?? "Not provided"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-white/35 mb-1">Email</p>
            <p className="text-sm text-white">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
