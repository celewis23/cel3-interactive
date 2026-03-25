"use client";

// NOTE: dangerouslySetInnerHTML is used for rendering HTML email bodies.
// This is acceptable for an internal admin tool where the operator controls the Gmail account.

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { DateTime } from "luxon";
import type {
  GmailThreadDetail,
  GmailMessageParsed,
  GmailThreadLink,
  GmailAttachment,
} from "@/lib/gmail/types";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentUrl(
  messageId: string,
  att: GmailAttachment,
  inline = false
): string {
  const p = new URLSearchParams({
    filename: att.filename,
    mime: att.mimeType,
    ...(inline ? { inline: "1" } : {}),
  });
  return `/api/admin/email/attachment/${messageId}/${att.attachmentId}?${p}`;
}

/** Replace cid: image references in HTML with proxied attachment URLs */
function resolveCidReferences(
  html: string,
  messageId: string,
  attachments: GmailAttachment[]
): string {
  return html.replace(/src="cid:([^"]+)"/gi, (_match, cid) => {
    const att = attachments.find(
      (a) => a.contentId === cid || a.contentId === cid.trim()
    );
    if (!att) return `src=""`;
    return `src="${attachmentUrl(messageId, att, true)}"`;
  });
}

function AttachmentChip({
  messageId,
  att,
}: {
  messageId: string;
  att: GmailAttachment;
}) {
  const isImage = att.mimeType.startsWith("image/");
  const isPdf = att.mimeType === "application/pdf";

  return (
    <a
      href={attachmentUrl(messageId, att)}
      target="_blank"
      rel="noopener noreferrer"
      download={att.filename}
      className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 transition-colors group"
    >
      {/* Icon */}
      <span className="shrink-0 text-white/40 group-hover:text-white/60 transition-colors">
        {isImage ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ) : isPdf ? (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        )}
      </span>
      <span className="text-sm text-white/70 group-hover:text-white transition-colors truncate max-w-[180px]">
        {att.filename}
      </span>
      {att.size > 0 && (
        <span className="text-xs text-white/30 shrink-0">{formatBytes(att.size)}</span>
      )}
      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/25 group-hover:text-white/50 transition-colors shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    </a>
  );
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
              className="mt-4 bg-white rounded-xl p-4 overflow-x-auto text-gray-900 text-sm"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: resolveCidReferences(
                  message.bodyHtml,
                  message.id,
                  message.attachments
                ),
              }}
            />
          ) : (
            <pre className="mt-4 whitespace-pre-wrap text-sm text-white/80 font-sans leading-relaxed">
              {message.bodyText}
            </pre>
          )}

          {/* Downloadable attachments (non-inline only) */}
          {message.attachments.filter((a) => !a.inline).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.attachments
                .filter((a) => !a.inline)
                .map((att) => (
                  <AttachmentChip
                    key={att.attachmentId}
                    messageId={message.id}
                    att={att}
                  />
                ))}
            </div>
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
  const [replyHtml, setReplyHtml] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);
  const [currentLink, setCurrentLink] = useState<GmailThreadLink | null>(link);
  const [signature, setSignature] = useState("");

  // Load signature once
  useEffect(() => {
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html }: { html: string }) => setSignature(html))
      .catch(() => {});
  }, []);

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
    const plainText = replyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainText) return;
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
          message: plainText,
          htmlBody: replyHtml,
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

      setReplyHtml("");
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
              <RichTextEditor
                value={replyOpen ? (replyHtml || (signature ? `<p><br></p><p><br></p>${signature}` : "")) : ""}
                onChange={setReplyHtml}
                placeholder="Write your reply…"
                minHeight="200px"
              />
            </div>

            {replyError && (
              <p className="text-sm text-red-400">{replyError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={replySending || !replyHtml.replace(/<[^>]+>/g, "").trim()}
                className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {replySending ? "Sending…" : "Send Reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyHtml("");
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
