"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    expired: "That sign-in link has expired or already been used. Please request a new one.",
    invalid: "Invalid sign-in link. Please request a new one.",
    server: "Something went wrong. Please try again.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await fetch("/api/portal/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs text-sky-400 uppercase tracking-widest mb-2">CEL3 Interactive</p>
          <h1 className="text-2xl font-semibold text-white">Client Portal</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to access your portal</p>
        </div>

        {errorParam && errorMessages[errorParam] && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
            {errorMessages[errorParam]}
          </div>
        )}

        {sent ? (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6 text-center">
            <p className="text-white font-medium mb-1">Check your email</p>
            <p className="text-sm text-white/50">
              If an account exists for <span className="text-white/80">{email}</span>, a sign-in link has been sent. It expires in 15 minutes.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-4 text-xs text-white/40 hover:text-white transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-white/20 mt-8">
          Not a CEL3 Interactive client?{" "}
          <a href="/" className="hover:text-white/50 transition-colors">Visit our website</a>
        </p>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
