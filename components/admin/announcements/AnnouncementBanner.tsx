"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BannerAnnouncement {
  _id: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  authorName: string;
  createdAt: string;
}

const SESSION_KEY = "dismissed_announcement";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<BannerAnnouncement[]>([]);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setDismissedId(stored);
    } catch {
      // sessionStorage unavailable
    }
    fetch("/api/admin/announcements?archived=false&limit=10")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {});
  }, []);

  if (!mounted || announcements.length === 0) return null;

  // Prefer most recent urgent announcement; fall back to most recent normal
  const urgent = announcements
    .filter((a) => a.priority === "urgent")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const normal = announcements
    .filter((a) => a.priority === "normal")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const banner = urgent ?? normal;

  if (!banner || banner._id === dismissedId) return null;

  function handleDismiss() {
    setDismissedId(banner._id);
    try {
      sessionStorage.setItem(SESSION_KEY, banner._id);
    } catch {
      // ignore
    }
  }

  const isUrgent = banner.priority === "urgent";

  const bgClass = isUrgent
    ? "bg-amber-500/15 border-amber-500/25 text-amber-200"
    : "bg-sky-500/15 border-sky-500/25 text-sky-200";

  const dotClass = isUrgent ? "bg-amber-400" : "bg-sky-400";
  const linkClass = isUrgent
    ? "text-amber-300 hover:text-amber-100"
    : "text-sky-300 hover:text-sky-100";
  const closeClass = isUrgent
    ? "text-amber-400/60 hover:text-amber-200"
    : "text-sky-400/60 hover:text-sky-200";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${bgClass} text-sm`}>
      {/* Indicator dot */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />

      {/* Title */}
      <p className="flex-1 font-medium truncate min-w-0">
        {isUrgent && (
          <span className="uppercase text-xs font-bold tracking-wide mr-2 opacity-70">
            Urgent:
          </span>
        )}
        {banner.title}
      </p>

      {/* View all link */}
      <Link
        href="/admin/announcements"
        className={`flex-shrink-0 text-xs font-medium underline underline-offset-2 transition-colors ${linkClass}`}
      >
        View all
      </Link>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        className={`flex-shrink-0 p-1 rounded transition-colors ${closeClass}`}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
