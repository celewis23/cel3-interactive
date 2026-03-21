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
  const [newCount, setNewCount] = useState<number | null>(null);

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
          // Only update the new-mail indicator, don't disrupt the current view
          const currentIds = threads.map((t) => t.id).join(",");
          const freshIds = (data.threads ?? []).map((t) => t.id).join(",");
          if (currentIds !== freshIds && data.threads.length > threads.length) {
            setNewCount(data.threads.length - threads.length);
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
    [threads]
  );

  // Initial load + label change
  useEffect(() => {
    setPageTokenStack([]);
    setCurrentToken(undefined);
    setNextPageToken(undefined);
    setNewCount(null);
    fetchThreads(label, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  // Polling every 60 s
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchThreads(label, currentToken, true);
    }, 60_000);
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
    setPageTokenStack((s) => [...s, currentToken ?? ""]);
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
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.from.toLowerCase().includes(search.toLowerCase())
      )
    : threads;

  const TABS: { key: Label; label: string }[] = [
    { key: "INBOX", label: "Inbox" },
    { key: "SENT", label: "Sent" },
    { key: "DRAFTS", label: "Drafts" },
  ];

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/8">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleLabelChange(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                label === t.key
                  ? "bg-sky-500/15 text-sky-400"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter by sender or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-sky-400/50 transition-colors"
        />
      </div>

      {/* New mail notice */}
      {newCount !== null && newCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-sky-500/10 border-b border-sky-500/20">
          <span className="text-sky-400 text-sm">
            {newCount} new email{newCount > 1 ? "s" : ""} arrived
          </span>
          <button
            onClick={() => {
              setNewCount(null);
              fetchThreads(label, undefined);
              setPageTokenStack([]);
              setCurrentToken(undefined);
            }}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Thread list */}
      {loading ? (
        <div className="px-4 py-12 text-center text-white/30 text-sm">Loading…</div>
      ) : error ? (
        <div className="px-4 py-12 text-center text-red-400 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-12 text-center text-white/25 text-sm">
          {search ? "No threads match your filter." : "No threads found."}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/email/thread/${t.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors group"
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0 w-2 h-2">
                  {!t.isRead && (
                    <span className="block w-2 h-2 rounded-full bg-sky-400" />
                  )}
                </div>

                {/* From */}
                <div className="w-36 flex-shrink-0 min-w-0">
                  <span
                    className={`truncate block text-sm ${
                      !t.isRead ? "font-semibold text-white" : "text-white/70"
                    }`}
                  >
                    {extractName(t.from)}
                  </span>
                </div>

                {/* Subject + snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm truncate ${
                        !t.isRead ? "font-semibold text-white" : "text-white/80"
                      }`}
                    >
                      {t.subject || "(no subject)"}
                    </span>
                    {t.messageCount > 1 && (
                      <span className="flex-shrink-0 text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
                        {t.messageCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 truncate mt-0.5">{t.snippet}</p>
                </div>

                {/* Date */}
                <div className="flex-shrink-0 text-xs text-white/30 group-hover:text-white/50 transition-colors">
                  {formatDate(t.date)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/8">
          <button
            onClick={handlePrev}
            disabled={pageTokenStack.length === 0}
            className="bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={!nextPageToken}
            className="bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
