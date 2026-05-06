"use client";

// NOTE: dangerouslySetInnerHTML is used for rendering HTML email bodies.
// Acceptable for an internal admin tool where the operator controls the Gmail account.

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DateTime } from "luxon";
import type {
  GmailThreadSummary,
  GmailThreadDetail,
  GmailMessageParsed,
  GmailAttachment,
  GmailThreadLink,
} from "@/lib/gmail/types";
import DisconnectButton from "@/app/admin/email/_components/DisconnectButton";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

type Label = "INBOX" | "SENT" | "DRAFTS";

const FOLDERS: { key: Label; label: string }[] = [
  { key: "INBOX", label: "Inbox" },
  { key: "SENT", label: "Sent" },
  { key: "DRAFTS", label: "Drafts" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from.split("@")[0] ?? from;
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/(\S+@\S+)/);
  return match ? match[1] : from;
}

function getThreadParty(thread: GmailThreadSummary, label: Label): string {
  if (label === "SENT") return thread.participant || thread.to || thread.from;
  return thread.participant || thread.from || thread.to;
}

function formatTime(ms: number): string {
  const dt = DateTime.fromMillis(ms);
  const now = DateTime.now();
  if (dt.hasSame(now, "day")) return dt.toFormat("h:mm a");
  if (dt.hasSame(now, "week")) return dt.toFormat("ccc");
  if (dt.year === now.year) return dt.toFormat("LLL d");
  return dt.toFormat("LLL d, yyyy");
}

function formatMessageDate(ms: number): string {
  return DateTime.fromMillis(ms).toFormat("LLL d, yyyy 'at' h:mm a");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function initials(from: string): string {
  const name = extractName(from).trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function attachmentUrl(messageId: string, att: GmailAttachment, inline = false): string {
  const p = new URLSearchParams({ filename: att.filename, mime: att.mimeType, ...(inline ? { inline: "1" } : {}) });
  return `/api/admin/email/attachment/${messageId}/${att.attachmentId}?${p}`;
}

function resolveCidReferences(html: string, messageId: string, attachments: GmailAttachment[]): string {
  return html.replace(/src="cid:([^"]+)"/gi, (_match, cid) => {
    const att = attachments.find((a) => a.contentId === cid || a.contentId === cid.trim());
    if (!att) return `src=""`;
    return `src="${attachmentUrl(messageId, att, true)}"`;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FolderIcon({ folder }: { folder: Label }) {
  if (folder === "SENT")
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    );
  if (folder === "DRAFTS")
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
      </svg>
    );
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function ThreadRow({
  thread,
  label,
  selected,
  onClick,
}: {
  thread: GmailThreadSummary;
  label: Label;
  selected: boolean;
  onClick: () => void;
}) {
  const party = getThreadParty(thread, label);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b transition-colors ${
        selected
          ? "bg-sky-400/8 border-sky-400/10"
          : thread.isRead
          ? "border-white/5 hover:bg-white/[0.025]"
          : "bg-sky-400/[0.04] border-sky-400/8 hover:bg-sky-400/[0.065]"
      }`}
    >
      <div className="mt-1.5 shrink-0 w-2">
        {!thread.isRead && <div className="w-2 h-2 rounded-full bg-sky-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm truncate ${!thread.isRead ? "font-semibold text-white" : "text-white/75"}`}>
            {extractName(party)}
          </span>
          <span className={`text-[11px] shrink-0 tabular-nums ${!thread.isRead ? "text-sky-200/80" : "text-white/30"}`}>
            {formatTime(thread.date)}
          </span>
        </div>
        <p className={`text-xs truncate mt-0.5 ${!thread.isRead ? "font-medium text-white/90" : "text-white/50"}`}>
          {thread.subject || "(no subject)"}
        </p>
        <p className="text-[11px] text-white/28 truncate mt-0.5">{thread.snippet}</p>
      </div>
    </button>
  );
}

function AttachmentChip({ messageId, att }: { messageId: string; att: GmailAttachment }) {
  const isImage = att.mimeType.startsWith("image/");
  return (
    <a
      href={attachmentUrl(messageId, att)}
      target="_blank"
      rel="noopener noreferrer"
      download={att.filename}
      className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/5"
    >
      <span className="shrink-0 text-white/40 group-hover:text-white/60 transition-colors">
        {isImage ? (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ) : (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
        )}
      </span>
      <span className="text-xs text-white/65 group-hover:text-white transition-colors truncate max-w-[160px]">{att.filename}</span>
      {att.size > 0 && <span className="text-[11px] text-white/30 shrink-0">{formatBytes(att.size)}</span>}
    </a>
  );
}

function MessageCard({ message, defaultOpen }: { message: GmailMessageParsed; defaultOpen: boolean }) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#090b10]">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{extractName(message.headers.from)}</span>
            <span className="text-xs text-white/35">{extractEmail(message.headers.from)}</span>
            {!message.isRead && (
              <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[11px] text-sky-200">Unread</span>
            )}
          </div>
          {message.headers.to && (
            <p className="text-xs text-white/28 mt-0.5">
              To: {message.headers.to}
              {message.headers.cc ? ` · CC: ${message.headers.cc}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/30">{formatMessageDate(message.internalDate)}</span>
          <svg
            width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            className={`text-white/30 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 border-t border-white/5">
          {message.bodyHtml ? (
            <div
              className="mt-4 bg-white rounded-xl p-4 overflow-x-auto text-gray-900 text-sm"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: resolveCidReferences(message.bodyHtml, message.id, message.attachments),
              }}
            />
          ) : (
            <pre className="mt-4 whitespace-pre-wrap text-sm text-white/75 font-sans leading-relaxed">
              {message.bodyText}
            </pre>
          )}
          {message.attachments.filter((a) => !a.inline).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.attachments.filter((a) => !a.inline).map((att) => (
                <AttachmentChip key={att.attachmentId} messageId={message.id} att={att} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmailView({
  threadId,
  data,
  loading,
  onBack,
}: {
  threadId: string;
  data: { thread: GmailThreadDetail; link: GmailThreadLink | null } | null;
  loading: boolean;
  onBack: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);
  const [signature, setSignature] = useState("");

  useEffect(() => {
    fetch("/api/admin/email/signature")
      .then((r) => (r.ok ? r.json() : { html: "" }))
      .then(({ html }: { html: string }) => setSignature(html))
      .catch(() => {});
  }, []);

  // Mark thread as read on mount
  useEffect(() => {
    if (!data?.thread) return;
    const hasUnread = data.thread.messages.some((m) => !m.isRead);
    if (hasUnread) {
      fetch(`/api/admin/email/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead" }),
      }).catch(() => {});
    }
  }, [threadId, data]);

  useEffect(() => {
    if (replySuccess) {
      const t = setTimeout(() => setReplySuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [replySuccess]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.thread) return;
    const plainText = replyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainText) return;
    setReplySending(true);
    setReplyError("");

    const messages = data.thread.messages;
    const lastMessage = messages[messages.length - 1];
    const fromAddress = lastMessage?.headers.from ?? "";
    const emailMatch = fromAddress.match(/<(.+?)>/) ?? fromAddress.match(/(\S+@\S+)/);
    const toAddress = emailMatch ? emailMatch[1] : fromAddress;

    try {
      const res = await fetch("/api/admin/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          to: toAddress,
          subject: lastMessage?.headers.subject ?? "",
          message: plainText,
          htmlBody: replyHtml,
          inReplyTo: lastMessage?.headers.messageId ?? "",
          references: (
            (lastMessage?.headers.references ?? "") + " " + (lastMessage?.headers.messageId ?? "")
          ).trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
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

  const thread = data?.thread;
  const messages = thread?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const subject = messages[0]?.headers.subject ?? "(no subject)";

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-1">
          {/* Back — mobile only */}
          <button
            onClick={onBack}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors mr-1"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Reply
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-white/30 animate-pulse">Loading…</p>
          </div>
        ) : !thread ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-white/30">Failed to load thread.</p>
          </div>
        ) : (
          <div className="p-5 max-w-3xl space-y-3">
            {/* Subject */}
            <h1 className="text-lg font-semibold text-white leading-snug mb-1">{subject}</h1>

            {/* Quick metadata */}
            {lastMessage && (
              <div className="text-xs text-white/35 space-y-0.5 mb-4 pb-4 border-b border-white/6">
                <p>
                  <span className="text-white/55">From:</span> {lastMessage.headers.from}
                </p>
                {lastMessage.headers.to && (
                  <p>
                    <span className="text-white/55">To:</span> {lastMessage.headers.to}
                  </p>
                )}
                <p>
                  <span className="text-white/55">Date:</span>{" "}
                  {formatMessageDate(lastMessage.internalDate)}
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, i) => (
              <MessageCard key={message.id} message={message} defaultOpen={i === messages.length - 1} />
            ))}

            {/* Reply success */}
            {replySuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reply sent!
              </div>
            )}

            {/* Reply form */}
            {replyOpen && (
              <form onSubmit={sendReply} className="space-y-4 rounded-2xl border border-white/10 bg-[#090b10] p-5">
                <p className="text-xs text-white/40">
                  Replying to{" "}
                  <span className="text-white/65">{extractEmail(lastMessage?.headers.from ?? "")}</span>
                </p>
                <RichTextEditor
                  value={replyHtml || (signature ? `<p><br></p><p><br></p>${signature}` : "")}
                  onChange={setReplyHtml}
                  placeholder="Write your reply…"
                  minHeight="180px"
                />
                {replyError && <p className="text-xs text-red-400">{replyError}</p>}
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
                    onClick={() => { setReplyOpen(false); setReplyHtml(""); setReplyError(""); }}
                    className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {!replyOpen && (
              <button
                onClick={() => setReplyOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Reply
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main InboxClient ─────────────────────────────────────────────────────────

interface Props {
  email: string;
  connectedNotice: boolean;
}

export default function InboxClient({ email, connectedNotice }: Props) {
  // Thread list state
  const [label, setLabel] = useState<Label>("INBOX");
  const [threads, setThreads] = useState<GmailThreadSummary[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [pageTokenStack, setPageTokenStack] = useState<string[]>([]);
  const [currentToken, setCurrentToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [newCount, setNewCount] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadsRef = useRef<GmailThreadSummary[]>([]);

  // Selected thread state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadData, setThreadData] = useState<{
    thread: GmailThreadDetail;
    link: GmailThreadLink | null;
  } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  // Layout state
  const [navExpanded, setNavExpanded] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");

  useEffect(() => { threadsRef.current = threads; }, [threads]);

  const fetchThreads = useCallback(async (lbl: Label, token?: string, silent = false) => {
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
        const current = threadsRef.current;
        const snap = (arr: GmailThreadSummary[]) =>
          arr.map((t) => `${t.id}:${t.isRead ? 1 : 0}:${t.date}:${t.messageCount}`).join(",");
        if (snap(current) !== snap(data.threads ?? [])) {
          if (data.threads.length > current.length) setNewCount(data.threads.length - current.length);
          else setNewCount(null);
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
  }, []);

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
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [label, currentToken, fetchThreads]);

  async function openThread(id: string) {
    setSelectedId(id);
    setMobileView("thread");
    setThreadData(null);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/admin/email/threads/${id}`);
      if (res.ok) setThreadData(await res.json());
    } finally {
      setLoadingThread(false);
    }
  }

  function closeThread() {
    setSelectedId(null);
    setMobileView("list");
    setThreadData(null);
  }

  function switchLabel(lbl: Label) {
    if (lbl === label) return;
    setLabel(lbl);
    setSearch("");
    setSelectedId(null);
    setThreadData(null);
    setMobileView("list");
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

  function refresh() {
    setNewCount(null);
    setPageTokenStack([]);
    setCurrentToken(undefined);
    fetchThreads(label, undefined);
  }

  const filtered = search.trim()
    ? threads.filter(
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.from.toLowerCase().includes(search.toLowerCase()),
      )
    : threads;

  const unreadCount = threads.filter((t) => !t.isRead).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#06080d]">
      {/* ── Page header ── */}
      <div
        className={`flex items-center justify-between px-6 py-3.5 border-b border-white/8 shrink-0 ${
          mobileView === "thread" ? "hidden lg:flex" : "flex"
        }`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-0.5">Mail Workspace</div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">Email Inbox</h1>
            {email && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/35">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                {email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={refresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/4 text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <Link
            href="/admin/email/compose"
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Compose
          </Link>
          <DisconnectButton />
        </div>
      </div>

      {/* Connected notice */}
      {connectedNotice && (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-sky-500/10 border-b border-sky-500/15 text-sky-200 text-xs font-medium shrink-0">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Gmail connected successfully!
        </div>
      )}

      {/* ── 3-panel area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder nav — desktop */}
        <div
          className={`hidden lg:flex flex-col border-r border-white/8 bg-[#050709] shrink-0 transition-all duration-200 ${
            navExpanded ? "w-52" : "w-14"
          }`}
        >
          <div
            className={`flex items-center border-b border-white/8 h-11 shrink-0 px-2 ${
              navExpanded ? "justify-between" : "justify-center"
            }`}
          >
            {navExpanded && (
              <span className="text-[11px] font-medium text-white/25 pl-1 uppercase tracking-wider">Folders</span>
            )}
            <button
              onClick={() => setNavExpanded((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
            {FOLDERS.map(({ key, label: folderLabel }) => {
              const active = label === key;
              return (
                <button
                  key={key}
                  onClick={() => switchLabel(key)}
                  className={`w-full flex items-center rounded-xl text-sm transition-colors ${
                    navExpanded ? "gap-2.5 px-2.5 py-2" : "justify-center py-2.5"
                  } ${
                    active ? "bg-sky-500/10 text-sky-400" : "text-white/45 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <FolderIcon folder={key} />
                  {navExpanded && (
                    <>
                      <span className="flex-1 text-left truncate">{folderLabel}</span>
                      {key === "INBOX" && unreadCount > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                            active ? "bg-sky-400/20 text-sky-200" : "bg-sky-500 text-white"
                          }`}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Folder nav — mobile icon strip */}
        <div
          className={`lg:hidden flex flex-col border-r border-white/8 bg-[#050709] shrink-0 w-12 ${
            mobileView === "thread" ? "hidden" : ""
          }`}
        >
          <div className="flex items-center justify-center h-11 border-b border-white/8">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </div>
          <nav className="flex-1 py-2 flex flex-col items-center gap-1">
            {FOLDERS.map(({ key }) => (
              <button
                key={key}
                onClick={() => switchLabel(key)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  label === key ? "bg-sky-500/10 text-sky-400" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                <FolderIcon folder={key} />
              </button>
            ))}
          </nav>
        </div>

        {/* Thread list */}
        <div
          className={`flex flex-col border-r border-white/8 bg-[#070a0f] shrink-0 ${
            mobileView === "thread"
              ? "hidden lg:flex lg:w-80 xl:w-96"
              : "flex flex-1 lg:flex-none lg:w-80 xl:w-96"
          }`}
        >
          {/* List header */}
          <div className="flex items-center justify-between px-4 h-11 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {FOLDERS.find((f) => f.key === label)?.label ?? label}
              </span>
              <span className="text-xs text-white/30">{filtered.length} threads</span>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 border-b border-white/8 shrink-0">
            <div className="relative">
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.4a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
              </svg>
              <input
                type="text"
                placeholder={label === "SENT" ? "Search recipient or subject" : "Search sender or subject"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-black/40 py-2 pl-9 pr-3 text-xs text-white placeholder-white/18 focus:border-sky-400/40 focus:outline-none focus:ring-1 focus:ring-sky-400/15 transition-colors"
              />
            </div>
          </div>

          {/* New email banner */}
          {newCount !== null && newCount > 0 && (
            <button
              onClick={refresh}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500/10 border-b border-sky-400/15 text-sky-200 text-xs font-medium hover:bg-sky-500/15 transition-colors shrink-0"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              {newCount} new — tap to load
            </button>
          )}

          {/* Thread list body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-px py-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-white/5 mt-2 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <div className="h-3 w-24 rounded bg-white/6 animate-pulse" />
                        <div className="h-3 w-10 rounded bg-white/5 animate-pulse" />
                      </div>
                      <div className="h-3 w-36 rounded bg-white/5 animate-pulse" />
                      <div className="h-3 w-44 rounded bg-white/4 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-white/40">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-sm text-white/35">{search ? "No matches" : "No messages"}</p>
              </div>
            ) : (
              filtered.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  label={label}
                  selected={selectedId === thread.id}
                  onClick={() => openThread(thread.id)}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 shrink-0">
              <span className="text-[11px] text-white/22">{filtered.length} shown</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={pageTokenStack.length === 0}
                  className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={handleNext}
                  disabled={!nextPageToken}
                  className="rounded-lg border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs text-sky-100 transition-colors hover:bg-sky-300/16 disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email view */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-[#06080d] ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedId ? (
            <EmailView
              threadId={selectedId}
              data={threadData}
              loading={loadingThread}
              onBack={closeThread}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24" className="text-white/18">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">No message selected</p>
                <p className="text-xs text-white/25 mt-1">Select a thread to read it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
