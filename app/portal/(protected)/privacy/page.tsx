export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function PortalPrivacyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Privacy</h1>
        <p className="text-sm text-white/40 mt-1">How your portal access and shared materials are handled.</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Account scope</h2>
          <p className="text-sm text-white/60">
            Your portal is scoped to your own account, projects, requests, invoices, files, and related records only.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Uploaded files</h2>
          <p className="text-sm text-white/60">
            Files you upload through the portal are stored in your dedicated shared Google Drive folder for your account.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Session security</h2>
          <p className="text-sm text-white/60">
            You can sign out at any time from the account menu. We also require a password change when temporary credentials are first issued.
          </p>
        </div>
      </div>
    </div>
  );
}
