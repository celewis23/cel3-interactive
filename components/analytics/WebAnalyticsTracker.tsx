"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const ENDPOINT = "/api/analytics/collect";
const SKIP_RE = /^\/(admin|portal|api|studio)(\/|$)/;
const SESSION_KEY = "c3_session";
const IGNORE_KEY = "c3_ignore";
const SESSION_IDLE_MS = 30 * 60 * 1000;

type PageviewRef = { id: string; startedAt: number; durationSent: boolean };

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
  } catch {
    // fall through to fetch
  }
  fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
}

function sessionId(): string {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { id?: string; at?: number };
      if (stored.id && typeof stored.at === "number" && now - stored.at < SESSION_IDLE_MS) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: stored.id, at: now }));
        return stored.id;
      }
    }
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return "no-storage";
  }
}

export default function WebAnalyticsTracker() {
  const pathname = usePathname();
  const current = useRef<PageviewRef | null>(null);
  const hasLanded = useRef(false);

  // Send the time-on-page beacon for the pageview in flight (at most once)
  function finalize() {
    const view = current.current;
    if (!view || view.durationSent) return;
    view.durationSent = true;
    const seconds = (Date.now() - view.startedAt) / 1000;
    if (seconds >= 1) send({ t: "exit", i: view.id, d: seconds });
  }

  useEffect(() => {
    finalize();
    current.current = null;

    if (!pathname || SKIP_RE.test(pathname)) return;
    try {
      if (localStorage.getItem(IGNORE_KEY) === "1") return;
    } catch {
      // storage unavailable — still track the view
    }

    const params = new URLSearchParams(window.location.search);
    const id = crypto.randomUUID();
    current.current = { id, startedAt: Date.now(), durationSent: false };
    send({
      t: "pageview",
      i: id,
      s: sessionId(),
      p: pathname,
      // external referrer only applies to the first view of a page load;
      // later views are internal navigations
      r: hasLanded.current ? "" : document.referrer,
      w: window.screen?.width,
      us: params.get("utm_source") ?? undefined,
      um: params.get("utm_medium") ?? undefined,
      uc: params.get("utm_campaign") ?? undefined,
    });
    hasLanded.current = true;
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") finalize();
    };
    window.addEventListener("pagehide", finalize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", finalize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
