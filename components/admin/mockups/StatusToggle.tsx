"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "staged" | "sent";

export default function StatusToggle({ slug, status }: { slug: string; status: Status }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const next: Status = status === "staged" ? "sent" : "staged";

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    try {
      const res = await fetch(`/api/admin/mockups/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
        status === "sent"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25"
          : "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25"
      }`}
      title={`Mark as ${next}`}
    >
      {pending ? "…" : status === "sent" ? "Sent" : "Staged"}
    </button>
  );
}
