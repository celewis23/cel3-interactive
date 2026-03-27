"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = {
  key: string;
  kind: "email" | "form_submission" | "lead" | "booking" | "announcement";
  title: string;
  body: string;
  href: string;
  timestamp: string;
  severity?: "normal" | "urgent";
};

const POLL_MS = 20_000;
const DISMISS_KEY = "cel3_notifications_prompt_dismissed";
const SEEN_KEY = "cel3_notifications_seen";

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function loadSeenKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistSeenKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = Array.from(keys).slice(-200);
  sessionStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
}

export default function AdminNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (!supportsBrowserNotifications()) return "unsupported";
    return Notification.permission;
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const initializedRef = useRef(false);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const promptAllowed = useMemo(() => {
    if (permission !== "default") return false;
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) !== "1";
  }, [permission]);

  useEffect(() => {
    seenKeysRef.current = loadSeenKeys();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/admin-notifications-sw.js")
      .then((registration) => {
        registrationRef.current = registration;
      })
      .catch((err) => {
        console.error("ADMIN_NOTIFICATION_SW_REGISTER_ERR:", err);
      });
  }, []);

  useEffect(() => {
    if (!promptAllowed) return;
    const timeout = window.setTimeout(() => setShowPrompt(true), 1200);
    return () => window.clearTimeout(timeout);
  }, [promptAllowed]);

  useEffect(() => {
    if (permission !== "granted") {
      setPushEnabled(false);
      return;
    }
    if (!supportsWebPush()) {
      return;
    }

    let cancelled = false;

    async function subscribeForPush() {
      try {
        const registration = registrationRef.current ?? await navigator.serviceWorker.ready;
        registrationRef.current = registration;

        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await loadApplicationServerKey(),
        });

        const res = await fetch("/api/admin/notifications/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!res.ok) {
          throw new Error("Failed to register push subscription");
        }

        if (!cancelled) setPushEnabled(true);
      } catch (err) {
        console.error("ADMIN_PUSH_SUBSCRIBE_ERR:", err);
        if (!cancelled) setPushEnabled(false);
      }
    }

    subscribeForPush();

    return () => {
      cancelled = true;
    };
  }, [permission]);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed(silentSeed = false) {
      try {
        const res = await fetch("/api/admin/notifications/feed", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items: NotificationItem[] = Array.isArray(data.notifications) ? data.notifications : [];

        if (cancelled) return;

        if (!initializedRef.current || silentSeed) {
          for (const item of items) seenKeysRef.current.add(item.key);
          persistSeenKeys(seenKeysRef.current);
          initializedRef.current = true;
          return;
        }

        const newItems = items.filter((item) => !seenKeysRef.current.has(item.key));
        if (newItems.length === 0) return;

        for (const item of newItems) {
          seenKeysRef.current.add(item.key);
        }
        persistSeenKeys(seenKeysRef.current);

        if (permission !== "granted") return;
        if (pushEnabled) return;

        for (const item of newItems.slice(0, 4)) {
          await showDesktopNotification(item, registrationRef.current);
        }
      } catch (err) {
        console.error("ADMIN_NOTIFICATION_FEED_ERR:", err);
      }
    }

    fetchFeed(true);

    const id = window.setInterval(() => {
      fetchFeed();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [permission, pushEnabled]);

  async function requestPermission() {
    if (!supportsBrowserNotifications()) return;
    try {
      const next = await Notification.requestPermission();
      setPermission(next);
      if (next !== "default") {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("ADMIN_NOTIFICATION_PERMISSION_ERR:", err);
    }
  }

  function dismissPrompt() {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setShowPrompt(false);
  }

  if (!showPrompt || permission === "unsupported") return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-[#0f1116] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)] lg:bottom-6 lg:right-6">
      <div className="text-sm font-semibold text-white">Enable notifications</div>
      <p className="mt-1 text-sm leading-relaxed text-white/55">
        Turn on desktop and mobile alerts for new email, form submissions, leads, bookings, and team notifications. On iPhone, add the app to your Home Screen for closed-app push support.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={requestPermission}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
        >
          Enable
        </button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

async function showDesktopNotification(item: NotificationItem, registration: ServiceWorkerRegistration | null) {
  const title = item.title;
  const options: NotificationOptions = {
    body: item.body,
    tag: item.key,
    data: { url: item.href },
    icon: "/window.svg",
    badge: "/window.svg",
  };

  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }

  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    window.location.href = item.href;
    notification.close();
  };
}

async function loadApplicationServerKey() {
  const res = await fetch("/api/admin/notifications/push", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load push config");
  }
  const data = await res.json();
  return urlBase64ToUint8Array(data.publicKey);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
