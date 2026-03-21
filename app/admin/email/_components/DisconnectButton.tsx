"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    setLoading(true);
    try {
      await fetch("/api/admin/email/auth/disconnect", { method: "POST" });
    } finally {
      router.push("/admin/email");
      router.refresh();
    }
  }

  return (
    <button
      onClick={disconnect}
      disabled={loading}
      className="text-xs text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {loading ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
