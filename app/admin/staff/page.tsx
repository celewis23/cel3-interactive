"use client";

import Link from "next/link";
import StaffList from "@/components/admin/staff/StaffList";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Backoffice</div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/roles"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors border border-white/8"
          >
            Manage Roles
          </Link>
          <Link
            href="/admin/staff/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            + Invite Member
          </Link>
        </div>
      </div>

      <StaffList />
    </div>
  );
}
