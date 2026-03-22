"use client";

import { useState } from "react";
import Link from "next/link";

type Estimate = {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  total: number;
};

type Props = {
  initialEstimates: Estimate[];
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-white/5 text-white/40",
  sent: "bg-sky-500/10 text-sky-400",
  viewed: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-green-500/10 text-green-400",
  declined: "bg-red-500/10 text-red-400",
  expired: "bg-white/5 text-white/20",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}

export default function EstimateList({ initialEstimates }: Props) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = initialEstimates.filter((e) => {
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchSearch =
      !search || e.clientName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
        <input
          type="text"
          placeholder="Search client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors flex-1 min-w-[180px]"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-10 text-center text-white/30 text-sm">
          No estimates found.
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Number</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Total</th>
                  <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((estimate) => (
                  <tr key={estimate._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/estimates/${estimate._id}`}
                        className="font-mono text-sky-400 hover:text-sky-300 text-xs"
                      >
                        {estimate.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm">{estimate.clientName}</div>
                      {estimate.clientCompany && (
                        <div className="text-white/40 text-xs">{estimate.clientCompany}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{estimate.date}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{estimate.expiryDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_BADGE[estimate.status] ?? "bg-white/5 text-white/40"}`}
                      >
                        {estimate.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      {formatCurrency(estimate.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/estimates/${estimate._id}`}
                        className="text-xs text-white/40 hover:text-white transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
