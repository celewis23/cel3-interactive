"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "cel3-portal-ios-push-prompt-dismissed";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const VAPID_KEY_USED = "cel3_portal_vapid_key_used";
const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports its UA as a Mac, but has touch support a real Mac doesn't.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function dismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at: number };
    return Date.now() - parsed.at < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * iOS Safari only supports Web Push for PWAs added to the Home Screen and
 * running standalone — a regular Safari tab can never receive push, no
 * matter what's granted. This only ever shows once that condition is met,
 * so it reaches existing users too (it isn't gated behind any first-visit
 * onboarding flag — it just checks live state on every protected page load).
 */
export default function IosPushPrompt() {
  const [eligible, setEligible] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const ok = isIOS() && isStandaloneApp() && supportsNotifications();
    setEligible(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!eligible) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/portal-sw.js", { scope: "/portal/" })
      .then((registration) => {
        registrationRef.current = registration;
      })
      .catch((err) => console.error("PORTAL_SW_REGISTER_ERR:", err));
  }, [eligible]);

  useEffect(() => {
    if (!eligible || permission === "granted" || dismissedRecently()) return;
    const timeout = window.setTimeout(() => setShowPrompt(true), 1200);
    return () => window.clearTimeout(timeout);
  }, [eligible, permission]);

  async function loadApplicationServerKey() {
    if (WEB_PUSH_PUBLIC_KEY) return urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY);
    const res = await fetch("/api/portal/notifications/push", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load portal push config");
    const data = await res.json();
    return urlBase64ToUint8Array(data.publicKey);
  }

  async function handleEnable() {
    setSubscribing(true);
    try {
      const next = await Notification.requestPermission();
      setPermission(next);
      if (next !== "granted") return;

      const registration = registrationRef.current ?? (await navigator.serviceWorker.ready);
      registrationRef.current = registration;
      const applicationServerKey = await loadApplicationServerKey();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));

      const res = await fetch("/api/portal/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Failed to register portal push subscription");
      localStorage.setItem(VAPID_KEY_USED, WEB_PUSH_PUBLIC_KEY);
      setShowPrompt(false);
    } catch (err) {
      console.error("PORTAL_IOS_PUSH_SUBSCRIBE_ERR:", err);
    } finally {
      setSubscribing(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ at: Date.now() }));
    setShowPrompt(false);
  }

  if (!eligible || !showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0f1116] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)] sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      {permission === "denied" ? (
        <>
          <div className="text-sm font-semibold text-white">Notifications are turned off</div>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            To get alerts for new messages, invoices, and updates, turn on notifications for this app in your
            iPhone&apos;s Settings → Notifications.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              Got it
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-semibold text-white">Turn on notifications</div>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            Get notified here about new messages, invoices, and updates on your account.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={subscribing}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
            >
              {subscribing ? "Enabling…" : "Enable"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
