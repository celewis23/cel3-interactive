"use client";

import { CheckCircle2 } from "lucide-react";

export default function ReportConfirmation({ sharedWithCommunity, onClose }: { sharedWithCommunity: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-5 text-center shadow-2xl">
        <CheckCircle2 size={36} className="mx-auto text-green-500" />
        <h3 className="mt-2 text-base font-semibold text-white">Report submitted</h3>
        <p className="mt-1 text-sm text-neutral-400">
          {sharedWithCommunity
            ? "This report is now visible to other Riverside Rally users in the area."
            : "This report is saved on this device only."}
        </p>
        <p className="mt-2 text-xs text-neutral-500">Put your phone down before continuing to drive.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-black hover:bg-amber-500">
          Done
        </button>
      </div>
    </div>
  );
}
