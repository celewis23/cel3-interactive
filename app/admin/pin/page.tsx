"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (next.every((d) => d !== "") && value) {
      submitPin(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  async function submitPin(pinValue: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Incorrect PIN");
        setPin(["", "", "", ""]);
        setTimeout(() => inputRefs[0].current?.focus(), 50);
        return;
      }
      router.push("/admin/case-studies");
    } catch {
      setError("Something went wrong. Try again.");
      setPin(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs tracking-widest uppercase text-sky-400 mb-2">Backoffice</div>
          <h1 className="text-2xl font-semibold text-white">Enter PIN</h1>
          <p className="text-sm text-white/40 mt-1">4-digit verification code</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="w-14 h-14 text-center text-2xl font-semibold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-sky-400/60 transition-colors disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-white/40 text-center">Verifying…</p>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/admin/login")}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
