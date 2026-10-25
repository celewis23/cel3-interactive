import AdminProfileSettings from "@/components/admin/AdminProfileSettings";
import AdminPasswordSettings from "@/components/admin/AdminPasswordSettings";

export const dynamic = "force-dynamic";

export default function AdminProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My profile</h1>
        <p className="mt-1 text-sm text-white/40">Manage your name, profile photo, and password.</p>
      </div>
      <AdminProfileSettings />
      <AdminPasswordSettings />
    </div>
  );
}
