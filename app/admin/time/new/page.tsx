"use client";

import Link from "next/link";
import TimeEntryForm from "@/components/admin/time/TimeEntryForm";

export default function NewTimePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Time Tracking</div>
        <h1 className="text-2xl font-bold text-white">Add Entry</h1>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <TimeEntryForm />
      </div>

      <div>
        <Link href="/admin/time" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back to Time Log
        </Link>
      </div>
    </div>
  );
}
