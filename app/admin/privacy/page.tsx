export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminPrivacyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Privacy</h1>
        <p className="text-sm text-white/40 mt-1">How account access and client data should be handled inside the backoffice.</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Least-access principle</h2>
          <p className="text-sm text-white/60">
            Staff permissions should stay limited to the data and actions each role actually needs.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Portal isolation</h2>
          <p className="text-sm text-white/60">
            Client portal records, invoices, files, requests, and assistant responses should remain scoped to the logged-in account only.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Auditability</h2>
          <p className="text-sm text-white/60">
            Use the audit log to review sensitive actions and account changes when you need a clear activity trail.
          </p>
        </div>
      </div>
    </div>
  );
}
