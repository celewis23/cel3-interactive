"use client";

// NOTE: dangerouslySetInnerHTML is used for rendering HTML email bodies.
// This is acceptable for an internal admin tool where the operator controls the Gmail account.

import { useState, useEffect, useCallback, useRef } from "react";
import { DateTime } from "luxon";
import type {
  GmailThreadDetail,
  GmailMessageParsed,
  GmailThreadLink,
} from "@/lib/gmail/types";

interface SearchResult {
  id: string;
  type: string;
  name: string;
}

interface Props {
  thread: GmailThreadDetail;
  link: GmailThreadLink | null;
}

function formatMessageDate(ms: number): string {
  return DateTime.fromMillis(ms).toFormat("LLL d, yyyy 'at' h:mm a");
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/(\S+@\S+)/);
  return match ? match[1] : from;
}

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from;
}

// ─── Single message card ───────────────────────────────────────────────────

function MessageCard({ message, index }: { message: GmailMessageParsed; index: number }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      {/* Message header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {extractName(message.headers.from)}
            </span>
            <span className="text-xs text-white/40">{extractEmail(message.headers.from)}</span>
            {!message.isRead && (
              <span className="bg-sky-500/20 text-sky-400 text-xs px-1.5 py-0.5 rounded-full">
                Unread
              </span>
            )}
          </div>
          {message.headers.to && (
            <p className="text-xs text-white/30 mt-0.5">
              To: {message.headers.to}
              {message.headers.cc ? ` · CC: ${message.headers.cc}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-white/30">
            {formatMessageDate(message.internalDate)}
          </span>
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className={`text-white/30 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Message body */}
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-white/5">
          {message.bodyHtml ? (
            <div
              className="mt-4 text-sm text-white/80 [&_a]:text-sky-400 [&_a]:underline [&_p]:mb-3 [&_h1]:text-lg [&_h2]:text-base max-w-none overflow-x-auto"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            />
          ) : (
            <pre className="mt-4 whitespace-pre-wrap text-sm text-white/80 font-sans leading-relaxed">
              {message.bodyText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Link panel ───────────────────────────────────────────────────────────

function LinkPanel({
  threadId,
  firstSubject,
  currentLink,
  onLinkChange,
}: {
  threadId: string;
  firstSubject: string;
  currentLink: GmailThreadLink | null;
  onLinkChange: (link: GmailThreadLink | null) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/admin/email/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  async function createLink(result: SearchResult) {
    setLinkLoading(true);
    try {
      const res = await fetch("/api/admin/email/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailThreadId: threadId,
          linkedRecordType: result.type,
          linkedRecordId: result.id,
          linkedRecordName: result.name,
          subject: firstSubject,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onLinkChange(data.link ?? null);
        setSearchOpen(false);
        setQ("");
        setResults([]);
      }
    } finally {
      setLinkLoading(false);
    }
  }

  async function removeLink() {
    setUnlinkLoading(true);
    try {
      const res = await fetch(`/api/admin/email/links/${threadId}`, {
        method: "DELETE",
      });
      if (res.ok) onLinkChange(null);
    } finally {
      setUnlinkLoading(false);
    }
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
        Linked Record
      </h3>

      {currentLink ? (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-white/40 mb-1">{currentLink.linkedRecordType}</div>
              <div className="text-sm font-medium text-white">{currentLink.linkedRecordName}</div>
              <div className="text-xs text-white/30 mt-1">
                Linked {DateTime.fromISO(currentLink.linkedAt).toFormat("LLL d, yyyy")}
              </div>
            </div>
            <button
              onClick={removeLink}
              disabled={unlinkLoading}
              className="text-xs text-white/30 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {unlinkLoading ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {!searchOpen ? (
            <button
              onClick={() => setSearchOpen(true)}
              className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
            >
              + Link to client record
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search clients, projects…"
                value={q}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-sky-400/50 transition-colors"
              />

              {searchLoading && (
                <p className="text-xs text-white/30">Searching…</p>
              )}

              {!searchLoading && results.length > 0 && (
                <ul className="space-y-1">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => createLink(r)}
                        disabled={linkLoading}
                        className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        <div>
                          <div className="text-sm text-white">{r.name}</div>
                          <div className="text-xs text-white/30">{r.type}</div>
                        </div>
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          className="text-white/30 flex-shrink-0"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!searchLoading && q.trim() && results.length === 0 && (
                <p className="text-xs text-white/30">No results found.</p>
              )}

              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQ("");
                  setResults([]);
                }}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ThreadClient ─────────────────────────────────────────────────────

export default function ThreadClient({ thread, link }: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);
  const [currentLink, setCurrentLink] = useState<GmailThreadLink | null>(link);

  const messages = thread.messages;
  const lastMessage = messages[messages.length - 1];
  const firstMessage = messages[0];

  // Mark thread as read on mount if any message is unread
  useEffect(() => {
    const hasUnread = messages.some((m) => !m.isRead);
    if (hasUnread) {
      fetch(`/api/admin/email/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead" }),
      }).catch(() => {
        // Best-effort — silently ignore failures
      });
    }
  }, [thread.id, messages]);

  // Auto-hide reply success notice
  useEffect(() => {
    if (replySuccess) {
      const t = setTimeout(() => setReplySuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [replySuccess]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySending(true);
    setReplyError("");

    const fromAddress = lastMessage?.headers.from ?? "";
    const emailMatch =
      fromAddress.match(/<(.+?)>/) ?? fromAddress.match(/(\S+@\S+)/);
    const toAddress = emailMatch ? emailMatch[1] : fromAddress;

    try {
      const res = await fetch("/api/admin/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          to: toAddress,
          subject: lastMessage?.headers.subject ?? "",
          message: replyText,
          inReplyTo: lastMessage?.headers.messageId ?? "",
          references:
            ((lastMessage?.headers.references ?? "") +
              " " +
              (lastMessage?.headers.messageId ?? "")).trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setReplyText("");
      setReplyOpen(false);
      setReplySuccess(true);
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Messages */}
        {messages.map((message, i) => (
          <MessageCard key={message.id} message={message} index={i} />
        ))}

        {/* Reply success notice */}
        {replySuccess && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Reply sent!
          </div>
        )}

        {/* Reply toggle / form */}
        {!replyOpen ? (
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
            Reply
          </button>
        ) : (
          <form
            onSubmit={sendReply}
            className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4"
          >
            <div className="text-xs text-white/40">
              Replying to{" "}
              <span className="text-white/70">
                {extractEmail(lastMessage?.headers.from ?? "")}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Message
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={6}
                required
                placeholder="Write your reply…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-sky-400/50 transition-colors resize-y"
              />
            </div>

            {replyError && (
              <p className="text-sm text-red-400">{replyError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={replySending || !replyText.trim()}
                className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {replySending ? "Sending…" : "Send Reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyError("");
                }}
                className="bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:w-72 flex-shrink-0 space-y-4">
        {/* Thread meta */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Thread Info
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-white/40 text-xs mb-0.5">Messages</dt>
              <dd className="text-white">{messages.length}</dd>
            </div>
            <div>
              <dt className="text-white/40 text-xs mb-0.5">From</dt>
              <dd className="text-white break-all">
                {firstMessage?.headers.from ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-white/40 text-xs mb-0.5">Started</dt>
              <dd className="text-white">
                {firstMessage
                  ? DateTime.fromMillis(firstMessage.internalDate).toFormat("LLL d, yyyy")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-white/40 text-xs mb-0.5">Last reply</dt>
              <dd className="text-white">
                {lastMessage
                  ? DateTime.fromMillis(lastMessage.internalDate).toFormat("LLL d, yyyy")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Link panel */}
        <LinkPanel
          threadId={thread.id}
          firstSubject={firstMessage?.headers.subject ?? ""}
          currentLink={currentLink}
          onLinkChange={setCurrentLink}
        />
      </div>
    </div>
  );
}
