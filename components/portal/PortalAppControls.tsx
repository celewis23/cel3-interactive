"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const VAPID_KEY_USED = "cel3_portal_vapid_key_used";
const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function supportsPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PortalAppControls({ rowClass }: { rowClass: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (!supportsNotifications()) return "unsupported";
    return Notification.permission;
  });
  const [pushEnabled, setPushEnabled] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const canShowInstall = useMemo(() => !standalone, [standalone]);

  useEffect(() => {
    setStandalone(isStandaloneApp());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setStandalone(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/portal-sw.js", { scope: "/portal/" })
      .then((registration) => {
        registrationRef.current = registration;
      })
      .catch((err) => console.error("PORTAL_SW_REGISTER_ERR:", err));
  }, []);

  useEffect(() => {
    if (permission !== "granted" || !supportsPush()) {
      setPushEnabled(false);
      return;
    }

    let cancelled = false;
    async function subscribe() {
      try {
        const registration = registrationRef.current ?? await navigator.serviceWorker.ready;
        registrationRef.current = registration;
        const applicationServerKey = await loadApplicationServerKey();
        const lastKey = localStorage.getItem(VAPID_KEY_USED);
        const keyChanged = WEB_PUSH_PUBLIC_KEY && lastKey !== WEB_PUSH_PUBLIC_KEY;
        if (keyChanged) {
          const stale = await registration.pushManager.getSubscription();
          if (stale) await stale.unsubscribe();
          localStorage.removeItem(VAPID_KEY_USED);
        }

        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        const res = await fetch("/api/portal/notifications/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!res.ok) throw new Error("Failed to register portal push subscription");
        localStorage.setItem(VAPID_KEY_USED, WEB_PUSH_PUBLIC_KEY);
        if (!cancelled) setPushEnabled(true);
      } catch (err) {
        console.error("PORTAL_PUSH_SUBSCRIBE_ERR:", err);
        if (!cancelled) setPushEnabled(false);
      }
    }

    void subscribe();
    return () => {
      cancelled = true;
    };
  }, [permission]);

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      setInstallPrompt(null);
      return;
    }
    window.alert("Use your browser menu to add the client portal to your Home Screen or install it as an app.");
  }

  async function enableNotifications() {
    if (!supportsNotifications()) return;
    const next = await Notification.requestPermission();
    setPermission(next);
  }

  return (
    <>
      {canShowInstall && (
        <button type="button" onClick={installApp} className={`${rowClass} w-full`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-4 w-4 rounded-[4px]" />
          <span>Download app</span>
        </button>
      )}
      {permission !== "unsupported" && (
        <button
          type="button"
          onClick={permission === "granted" && !pushEnabled ? () => window.location.reload() : enableNotifications}
          className={`${rowClass} w-full`}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span>{permission === "granted" && pushEnabled ? "Alerts on" : "Enable alerts"}</span>
        </button>
      )}
    </>
  );
}

async function loadApplicationServerKey() {
  if (WEB_PUSH_PUBLIC_KEY) return urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY);
  const res = await fetch("/api/portal/notifications/push", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load portal push config");
  const data = await res.json();
  return urlBase64ToUint8Array(data.publicKey);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
