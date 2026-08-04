"use client";

import { useEffect, useState } from "react";

export default function PortalVerifyPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      window.location.replace("/portal/auth/login?error=invalid");
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch("/api/portal/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({})) as { redirectTo?: string; error?: string };
        if (!res.ok) {
          window.location.replace(`/portal/auth/login?error=${data.error === "server" ? "server" : "expired"}`);
          return;
        }
        window.location.replace(data.redirectTo ?? "/portal");
      } catch {
        setError("We could not verify this link. Please try again or request a new sign-in link.");
      }
    }

    void verifyToken();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs text-sky-400 uppercase tracking-widest mb-4">CEL3 Interactive</p>
        <h1 className="text-xl font-semibold text-white mb-2">Verifying sign-in link…</h1>
        <p className="text-sm text-white/40">
          {error || "You'll be redirected to your portal in a moment."}
        </p>
      </div>
    </div>
  );
}
