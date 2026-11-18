"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ConnectMeterwiseAndroid() {
  const started = useRef(false);
  const [error, setError] = useState("");
  const [callback, setCallback] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const challenge = new URL(window.location.href).searchParams.get("challenge") ?? "";
    if (!/^[a-f0-9]{64}$/.test(challenge)) { setError("Open Meterwise on your Android phone and tap Connect to backoffice."); return; }
    void (async () => {
      try {
        const response = await fetch("/api/admin/meterwise/device", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not connect this phone");
        const url = `meterwise://connect?code=${encodeURIComponent(result.code)}`;
        setCallback(url);
        window.location.href = url;
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not connect this phone"); }
    })();
  }, []);
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-sky-400/20 bg-sky-400/5 p-8">
      <p className="text-xs uppercase tracking-widest text-sky-400">Meterwise for Android</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">{error ? "Let’s reconnect your phone" : "Connecting your app and widget"}</h1>
      <p className="mt-4 text-sm leading-6 text-white/60">{error || "We’re using your current backoffice sign-in. Your app and home-screen widget share the same connection."}</p>
      {callback && <a href={callback} className="mt-6 inline-block rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-black">Open Meterwise app</a>}
      {error && <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-black">Try again</button>}
      {error && <button onClick={() => { window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; }} className="mt-4 block text-sm text-sky-300">Sign in again to backoffice</button>}
      <Link href="/admin/meterwise" className="mt-6 block text-sm text-sky-300">Back to Meterwise</Link>
    </div>
  );
}
