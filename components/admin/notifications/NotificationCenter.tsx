"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const categories: Record<string, string> = {
  email: "Emails", message: "Messages", client_request: "Client requests",
  form_submission: "Form submissions", lead: "Leads", booking: "Bookings", announcement: "Announcements",
};
type Item = { key: string; title: string; body: string; href: string; timestamp: string };

export default function NotificationCenter({ kind }: { kind: string }) {
  const category = categories[kind] ? kind : "email";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setItems([]);
    async function load() {
      try {
        const res = await fetch(`/api/admin/notifications/feed?kind=${category}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(res.status === 401 ? "Sign in to view your notifications." : "Could not load notifications. Please try again.");
        const data = await res.json();
        if (!cancelled) { setItems(data.notifications ?? []); setError(""); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load notifications.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 20_000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; controller.abort(); clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [category, refresh]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm text-white/60 hover:text-white">← Backoffice</Link>
      <div className="my-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Notifications</h1>
        <button type="button" onClick={() => setRefresh(value => value + 1)} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white">Refresh</button>
      </div>
      <nav aria-label="Notification categories" className="mb-5 flex flex-wrap gap-2">
        {Object.entries(categories).map(([key, label]) => (
          <Link key={key} href={`/admin/notifications?kind=${key}`} aria-current={key === category ? "page" : undefined}
            className={`rounded-full border px-3 py-2 text-sm ${key === category ? "border-sky-400 bg-sky-400/15 text-sky-300" : "border-white/15 text-white/60"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <h2 className="mb-2 text-lg font-medium text-white">{categories[category]}</h2>
      <p className="mb-4 text-sm text-white/50">{category === "email" || category === "message" ? "Unread items, newest first." : "Recent items, newest first."} Select an item to open it. This list updates automatically.</p>
      {items.length >= 50 && <p className="mb-4 text-sm text-white/50">Showing the latest 50 items.</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
      {loading ? <p role="status" className="text-white/60">Loading notifications…</p> : !error && !items.length ? <p className="rounded-xl border border-white/10 p-5 text-white/60">You’re all caught up. No {category === "email" || category === "message" ? "unread" : "recent"} {categories[category].toLowerCase()}.</p> : (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
          {items.map(item => <li key={item.key}>
            <Link href={item.href} className="block p-4 hover:bg-white/5 focus-visible:outline-sky-400">
              <span className="block break-words font-medium text-white">{item.title}</span>
              <span className="mt-1 block break-words text-sm text-white/60">{item.body}</span>
              <time dateTime={item.timestamp} className="mt-2 block text-xs text-white/40">{new Date(item.timestamp).toLocaleString()}</time>
            </Link>
          </li>)}
        </ul>
      )}
    </div>
  );
}
