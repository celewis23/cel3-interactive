"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import type { GmailThreadSummary } from "@/lib/gmail/types";

type Label = "INBOX" | "SENT" | "DRAFTS";

interface Props {
  initialLabel?: string;
}

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from.split("@")[0] ?? from;
}

function formatDate(ms: number): string {
  const dt = DateTime.fromMillis(ms);
  const now = DateTime.now();
  if (dt.year === now.year) return dt.toFormat("LLL d");
  return dt.toFormat("LLL d, yyyy");
}

function formatTime(ms: number): string {
  const dt = DateTime.fromMillis(ms);
  const now = DateTime.now();
  if (dt.hasSame(now, "day")) return dt.toFormat("h:mm a");
  if (dt.hasSame(now, "week")) return dt.toFormat("ccc");
  return formatDate(ms);
}

function initials(from: string): string {
  const name = extractName(from).trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function InboxClient({ initialLabel = "INBOX" }: Props) {
  const [label, setLabel] = useState<Label>(initialLabel as Label);
  const [threads, setThreads] = useState<GmailThreadSummary[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [pageTokenStack, setPageTokenStack] = useState<string[]>([]);
  const [currentToken, setCurrentToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadsRef = useRef<GmailThreadSummary[]>([]);
  const [newCount, setNewCount] = useState<number | null>(null);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const fetchThreads = useCallback(
    async (lbl: Label, token?: string, silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ label: lbl });
        if (token) params.set("pageToken", token);
        const res = await fetch(`/api/admin/email/threads?${params}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const data: { threads: GmailThreadSummary[]; nextPageToken?: string } = await res.json();
        if (silent) {
          const currentThreads = threadsRef.current;
          const currentSnapshot = currentThreads
            .map((t) => `${t.id}:${t.isRead ? 1 : 0}:${t.date}:${t.messageCount}`)
            .join(",");
          const freshSnapshot = (data.threads ?? [])
            .map((t) => `${t.id}:${t.isRead ? 1 : 0}:${t.date}:${t.messageCount}`)
            .join(",");

          if (currentSnapshot !== freshSnapshot) {
            if (data.threads.length > currentThreads.length) {
              setNewCount(data.threads.length - currentThreads.length);
            } else {
              setNewCount(null);
            }
            setThreads(data.threads ?? []);
            setNextPageToken(data.nextPageToken);
          }
          return;
        }

        setThreads(data.threads ?? []);
        setNextPageToken(data.nextPageToken);
      } catch (e: unknown) {
        if (!silent) setError(e instanceof Error ? e.message : "Failed to load threads");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setPageTokenStack([]);
    setCurrentToken(undefined);
    setNextPageToken(undefined);
    setNewCount(null);
    fetchThreads(label, undefined);
  }, [label, fetchThreads]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchThreads(label, currentToken, true);
    }, 15_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [label, currentToken, fetchThreads]);

  function handleLabelChange(next: Label) {
    if (next === label) return;
    setLabel(next);
    setSearch("");
  }

  function handleNext() {
    if (!nextPageToken) return;
    setPageTokenStack((stack) => [...stack, currentToken ?? ""]);
    setCurrentToken(nextPageToken);
    fetchThreads(label, nextPageToken);
  }

  function handlePrev() {
    const stack = [...pageTokenStack];
    const prev = stack.pop();
    setPageTokenStack(stack);
    const token = prev === "" ? undefined : prev;
    setCurrentToken(token);
    fetchThreads(label, token);
  }

  const filtered = search.trim()
    ? threads.filter(
        (thread) =>
          thread.subject.toLowerCase().includes(search.toLowerCase()) ||
          thread.from.toLowerCase().includes(search.toLowerCase())
      )
    : threads;

  const tabs: Array<{ key: Label; label: string }> = [
    { key: "INBOX", label: "Inbox" },
    { key: "SENT", label: "Sent" },
    { key: "DRAFTS", label: "Drafts" },
  ];

  const unreadCount = threads.filter((thread) => !thread.isRead).length;
  const activeLabel = tabs.find((tab) => tab.key === label)?.label ?? "Inbox";

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#06080d] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/8 bg-[#0b0d12]">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Mail Workspace</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-white">{activeLabel}</h2>
              <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-200">
                {threads.length} thread{threads.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/55">
                {unreadCount} unread
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            <div className="inline-flex rounded-2xl border border-white/10 bg-black p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleLabelChange(tab.key)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    label === tab.key
                      ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.14)]"
                      : "text-white/55 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.4a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search sender or subject"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/15"
              />
            </div>
          </div>
        </div>
      </div>

      {newCount !== null && newCount > 0 && (
        <div className="flex items-center justify-between border-b border-sky-400/20 bg-sky-400/10 px-5 py-3">
          <span className="text-sm font-medium text-sky-100">
            {newCount} new email{newCount > 1 ? "s" : ""} synced
          </span>
          <button
            onClick={() => {
              setNewCount(null);
              fetchThreads(label, undefined);
              setPageTokenStack([]);
              setCurrentToken(undefined);
            }}
            className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-100 transition-colors hover:bg-sky-300/18"
          >
            Show latest
          </button>
        </div>
      )}

      <div className="border-b border-white/6 bg-[#090b10] px-5 py-3">
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2.2fr)_88px] gap-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/28">
          <span>Sender</span>
          <span>Conversation</span>
          <span className="text-right">Updated</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 bg-[#06080d] px-5 py-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2.2fr)_88px] items-center gap-4 rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/8" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/8" />
                  <div className="h-3 w-16 animate-pulse rounded bg-white/6" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-40 animate-pulse rounded bg-white/8" />
                <div className="h-3 w-56 animate-pulse rounded bg-white/6" />
              </div>
              <div className="ml-auto h-3 w-12 animate-pulse rounded bg-white/6" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-[#06080d] px-5 py-16 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0b0d12] px-6 py-8">
            <div className="text-sm font-medium text-white">Inbox unavailable</div>
            <div className="mt-2 text-sm text-white/55">{error}</div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#06080d] px-5 py-16 text-center">
          <div className="mx-auto max-w-md rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-10">
            <div className="text-base font-medium text-white/80">
              {search ? "No matching conversations" : "No conversations here yet"}
            </div>
            <div className="mt-2 text-sm text-white/35">
              {search ? "Try a different sender or subject search." : `Your ${activeLabel.toLowerCase()} view is empty.`}
            </div>
          </div>
        </div>
      ) : (
        <ul className="space-y-2 bg-[#06080d] px-3 py-3">
          {filtered.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/admin/email/thread/${thread.id}`}
                className={`group grid grid-cols-[minmax(0,1.1fr)_minmax(0,2.2fr)_88px] items-center gap-4 rounded-2xl border px-3.5 py-3.5 transition-all ${
                  thread.isRead
                    ? "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.035]"
                    : "border-sky-400/14 bg-sky-400/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-sky-300/24 hover:bg-sky-300/[0.08]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold ${
                      thread.isRead
                        ? "border-white/8 bg-white/[0.045] text-white/65"
                        : "border-sky-300/20 bg-sky-300/15 text-sky-100"
                    }`}
                  >
                    {initials(thread.from)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!thread.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-sky-300" />}
                      <span className={`block truncate text-sm ${thread.isRead ? "text-white/82" : "font-semibold text-white"}`}>
                        {extractName(thread.from)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-white/32">{thread.from}</div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm ${thread.isRead ? "text-white/76" : "font-semibold text-white"}`}>
                      {thread.subject || "(no subject)"}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[11px] font-medium text-white/50">
                        {thread.messageCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs leading-5 text-white/32">{thread.snippet}</p>
                </div>

                <div className="text-right">
                  <div className={`text-xs ${thread.isRead ? "text-white/30" : "font-medium text-sky-100/85"}`}>
                    {formatTime(thread.date)}
                  </div>
                  <div className="mt-1 text-[11px] text-white/22">{formatDate(thread.date)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && (
        <div className="flex items-center justify-between border-t border-white/8 bg-[#0b0d12] px-5 py-4">
          <div className="text-xs text-white/30">
            {filtered.length} visible thread{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNewCount(null);
                setPageTokenStack([]);
                setCurrentToken(undefined);
                fetchThreads(label, undefined);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white"
            >
              Refresh
            </button>
            <button
              onClick={handlePrev}
              disabled={pageTokenStack.length === 0}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!nextPageToken}
              className="rounded-xl border border-sky-300/20 bg-sky-300/12 px-4 py-2 text-sm text-sky-100 transition-colors hover:bg-sky-300/18 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
