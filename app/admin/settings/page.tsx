import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Core workspace controls for your backoffice.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/content"
          className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors"
        >
          <h2 className="text-sm font-semibold text-white">Business settings</h2>
          <p className="text-sm text-white/50 mt-2">Update company details, site content, and organization-level information.</p>
        </Link>
        <Link
          href="/admin/integrations"
          className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors"
        >
          <h2 className="text-sm font-semibold text-white">Integrations</h2>
          <p className="text-sm text-white/50 mt-2">Manage Google, Stripe, and other connected services used across the workspace.</p>
        </Link>
      </div>
    </div>
  );
}
