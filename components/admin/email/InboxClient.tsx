"use client";

// NOTE: dangerouslySetInnerHTML is used for rendering HTML email bodies.
// Acceptable for an internal admin tool where the operator controls the Gmail account.

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type {
  GmailThreadSummary,
  GmailThreadDetail,
  GmailMessageParsed,
  GmailAttachment,
  GmailThreadLink,
} from "@/lib/gmail/types";
import EmailTagInput, { type EmailSuggestion } from "./EmailTagInput";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

type Label = "INBOX" | "STARRED" | "SNOOZED" | "SENT" | "DRAFTS" | "SPAM" | "TRASH";
type MobileView = "list" | "thread" | "compose";

interface FolderDef { key: Label; label: string }

const FOLDERS: FolderDef[] = [
  { key: "INBOX",   label: "Inbox"   },
  { key: "STARRED", label: "Starred" },
  { key: "SNOOZED", label: "Snoozed" },
  { key: "SENT",    label: "Sent"    },
  { key: "DRAFTS",  label: "Drafts"  },
  { key: "SPAM",    label: "Spam"    },
  { key: "TRASH",   label: "Trash"   },
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function FolderIcon({ folder }: { folder: Label }) {
  switch (folder) {
    case "INBOX":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case "STARRED":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case "SNOOZED":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "SENT":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      );
    case "DRAFTS":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      );
    case "SPAM":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "TRASH":
      return (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      );
  }
}

// ─── ThreadRow ────────────────────────────────────────────────────────────────

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

// ─── AttachmentChip ───────────────────────────────────────────────────────────

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

// ─── MessageCard ──────────────────────────────────────────────────────────────

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

// ─── EmailView ────────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between px-4 h-11 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-1">
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
            <h1 className="text-lg font-semibold text-white leading-snug mb-1">{subject}</h1>
            {lastMessage && (
              <div className="text-xs text-white/35 space-y-0.5 mb-4 pb-4 border-b border-white/6">
                <p><span className="text-white/55">From:</span> {lastMessage.headers.from}</p>
                {lastMessage.headers.to && (
                  <p><span className="text-white/55">To:</span> {lastMessage.headers.to}</p>
                )}
                <p><span className="text-white/55">Date:</span> {formatMessageDate(lastMessage.internalDate)}</p>
              </div>
            )}
            {messages.map((message, i) => (
              <MessageCard key={message.id} message={message} defaultOpen={i === messages.length - 1} />
            ))}
            {replySuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reply sent!
              </div>
            )}
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

// ─── SettingsDropdown ─────────────────────────────────────────────────────────

function SettingsDropdown({ email, open }: { email: string; open: boolean }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [imapSsl, setImapSsl] = useState(true);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/admin/email/auth/disconnect", { method: "POST" });
    } finally {
      router.push("/admin/email");
      router.refresh();
    }
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-[#0c0f16] shadow-2xl shadow-black/60 z-50 overflow-hidden">
      {/* Google Workspace */}
      <div className="px-4 pt-4 pb-3.5 border-b border-white/8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25 mb-3">
          Google Workspace
        </p>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span className="text-xs text-white/70 truncate flex-1 min-w-0">{email}</span>
          <span className="text-[11px] text-sky-400 font-medium shrink-0">Connected</span>
        </div>
        <button
          onClick={disconnect}
          disabled={disconnecting}
          className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/55 hover:text-white hover:border-white/15 hover:bg-white/7 transition-colors disabled:opacity-50 text-left"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect Gmail account"}
        </button>
      </div>

      {/* IMAP / cPanel */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
            IMAP / cPanel Email
          </p>
          <span className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded-md">
            Coming soon
          </span>
        </div>
        <div className="space-y-2 opacity-40 pointer-events-none select-none">
          <input
            type="text"
            placeholder="mail.yourdomain.com"
            value={imapHost}
            onChange={(e) => setImapHost(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Port (993)"
              value={imapPort}
              onChange={(e) => setImapPort(e.target.value)}
              className="w-24 shrink-0 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none"
            />
            <input
              type="text"
              placeholder="Username"
              value={imapUser}
              onChange={(e) => setImapUser(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none"
            />
          </div>
          <input
            type="password"
            placeholder="Password"
            value={imapPass}
            onChange={(e) => setImapPass(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={imapSsl}
              onChange={(e) => setImapSsl(e.target.checked)}
              className="rounded border-white/20 bg-black/40 accent-sky-500"
            />
            <span className="text-xs text-white/50">Use SSL/TLS</span>
          </label>
          <button
            disabled
            className="w-full rounded-xl bg-sky-500/20 px-3 py-2 text-xs text-sky-200/40 cursor-not-allowed"
          >
            Save IMAP Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ComposePanel ─────────────────────────────────────────────────────────────

interface ComposePanelProps {
  fromEmail: string;
  onClose: () => void;
  onSent: () => void;
}

function ComposePanel({ fromEmail, onClose, onSent }: ComposePanelProps) {
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; file: File }[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [recipientSuggestions, setRecipientSuggestions] = useState<EmailSuggestion[]>([]);
  const [recipientSearchLoading, setRecipientSearchLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipientSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html: sig }: { html: string }) => {
        if (sig) setHtml(`<p><br></p><p><br></p>${sig}`);
      })
      .catch(() => {});
  }, []);

  function handleRecipientInputChange(value: string) {
    if (recipientSearchTimeout.current) clearTimeout(recipientSearchTimeout.current);
    const query = value.trim();
    if (query.length < 2) { setRecipientSuggestions([]); setRecipientSearchLoading(false); return; }
    setRecipientSearchLoading(true);
    recipientSearchTimeout.current = setTimeout(() => {
      fetch(`/api/admin/email/recipients?q=${encodeURIComponent(query)}`)
        .then(res => res.ok ? res.json() : { suggestions: [] })
        .then((data: { suggestions?: EmailSuggestion[] }) => setRecipientSuggestions(data.suggestions ?? []))
        .catch(() => setRecipientSuggestions([]))
        .finally(() => setRecipientSearchLoading(false));
    }, 180);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (toEmails.length === 0 || !subject.trim() || !html.replace(/<[^>]+>/g, "").trim()) return;
    setSending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("to", toEmails.join(", "));
      fd.append("subject", subject.trim());
      fd.append("htmlBody", html);
      if (ccEmails.length > 0) fd.append("cc", ccEmails.join(", "));
      if (bccEmails.length > 0) fd.append("bcc", bccEmails.join(", "));
      for (const att of attachedFiles) fd.append("attachments", att.file);
      const res = await fetch("/api/admin/email/send", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setToEmails([]); setCcEmails([]); setBccEmails([]);
    setShowCc(false); setShowBcc(false);
    setSubject(""); setAttachedFiles([]);
    setSending(false); setDone(false); setError("");
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html: sig }: { html: string }) => setHtml(sig ? `<p><br></p><p><br></p>${sig}` : ""))
      .catch(() => setHtml(""));
  }

  const isEmpty = !html.replace(/<[^>]*>/g, "").trim();

  // ── Header (shared between done and form views) ──
  const header = (
    <div className="flex items-center gap-2 px-4 h-11 border-b border-white/8 shrink-0">
      <button
        onClick={onClose}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-white">New Email</span>
        {fromEmail && (
          <span className="text-xs text-white/30 ml-2 hidden sm:inline">Sending as {fromEmail}</span>
        )}
      </div>
      <a
        href="/admin/email/compose"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden lg:flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors"
        title="Open full composer with Drive attachment support"
      >
        Full composer
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
      <button
        onClick={onClose}
        className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/5 transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  if (done) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-sky-500/12 flex items-center justify-center mb-4">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-sky-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-1">Email sent!</h3>
          <p className="text-white/50 text-sm mb-6">
            Your email to{" "}
            <span className="text-white/80">
              {toEmails.length === 1 ? toEmails[0] : `${toEmails.length} recipients`}
            </span>{" "}
            was sent successfully.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              Compose another
            </button>
            <button
              onClick={onSent}
              className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {header}

      <form onSubmit={handleSend} className="flex flex-col flex-1 min-h-0">
        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto">
          {/* To */}
          <div className="flex items-start gap-3 px-4 py-2.5 border-b border-white/6">
            <span className="text-xs text-white/35 shrink-0 mt-2 w-6">To</span>
            <div className="flex-1 min-w-0">
              <EmailTagInput
                emails={toEmails}
                onChange={setToEmails}
                placeholder="recipient@example.com"
                required
                suggestions={recipientSuggestions}
                loadingSuggestions={recipientSearchLoading}
                onInputChange={handleRecipientInputChange}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-2">
              {!showCc && (
                <button type="button" onClick={() => setShowCc(true)} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Cc</button>
              )}
              {!showBcc && (
                <button type="button" onClick={() => setShowBcc(true)} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Bcc</button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-b border-white/6">
              <span className="text-xs text-white/35 shrink-0 mt-2 w-6">Cc</span>
              <div className="flex-1 min-w-0">
                <EmailTagInput
                  emails={ccEmails}
                  onChange={setCcEmails}
                  placeholder="cc@example.com"
                  suggestions={recipientSuggestions}
                  loadingSuggestions={recipientSearchLoading}
                  onInputChange={handleRecipientInputChange}
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowCc(false); setCcEmails([]); }}
                className="mt-2 shrink-0 text-white/25 hover:text-white/60 transition-colors"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-start gap-3 px-4 py-2.5 border-b border-white/6">
              <span className="text-xs text-white/35 shrink-0 mt-2 w-6">Bcc</span>
              <div className="flex-1 min-w-0">
                <EmailTagInput
                  emails={bccEmails}
                  onChange={setBccEmails}
                  placeholder="bcc@example.com"
                  suggestions={recipientSuggestions}
                  loadingSuggestions={recipientSearchLoading}
                  onInputChange={handleRecipientInputChange}
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowBcc(false); setBccEmails([]); }}
                className="mt-2 shrink-0 text-white/25 hover:text-white/60 transition-colors"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/6">
            <span className="text-xs text-white/35 shrink-0 w-6">Sub</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
              className="flex-1 bg-transparent text-sm text-white placeholder-white/18 outline-none"
            />
          </div>

          {/* Body */}
          <div className="px-4 pt-4 pb-2">
            <RichTextEditor
              value={html}
              onChange={setHtml}
              placeholder="Write your message…"
              minHeight="180px"
            />
          </div>

          {/* Attached files */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {attachedFiles.map((att) => (
                <div key={att.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black px-3 py-1.5">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/40 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  <span className="text-xs text-white/65 truncate max-w-[120px]">{att.name}</span>
                  <span className="text-[11px] text-white/30">{formatBytes(att.size)}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((f) => f.filter((a) => a.id !== att.id))}
                    className="text-white/25 hover:text-red-400 transition-colors"
                  >
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8 shrink-0 flex-wrap">
          {error ? (
            <p className="text-xs text-red-400 flex-1 min-w-0 truncate">{error}</p>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-black px-3 py-1.5 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || toEmails.length === 0 || !subject.trim() || isEmpty}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {sending ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Send
              </>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files).map((f) => ({
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
                name: f.name,
                size: f.size,
                file: f,
              }));
              setAttachedFiles((prev) => [...prev, ...files]);
              e.target.value = "";
            }
          }}
        />
      </form>
    </div>
  );
}

// ─── Main InboxClient ─────────────────────────────────────────────────────────

interface Props {
  email: string;
  connectedNotice: boolean;
}

export default function InboxClient({ email, connectedNotice }: Props) {
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadData, setThreadData] = useState<{
    thread: GmailThreadDetail;
    link: GmailThreadLink | null;
  } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [navExpanded, setNavExpanded] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [settingsOpen]);

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
    setComposeOpen(false);
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

  function openCompose() {
    setComposeOpen(true);
    setSelectedId(null);
    setThreadData(null);
    setMobileView("compose");
  }

  function closeCompose() {
    setComposeOpen(false);
    setMobileView("list");
  }

  function switchLabel(lbl: Label) {
    if (lbl === label) return;
    setLabel(lbl);
    setSearch("");
    setSelectedId(null);
    setThreadData(null);
    setComposeOpen(false);
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
      {/* ── Page header (hidden on mobile when thread/compose is open) ── */}
      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/8 shrink-0 ${
          mobileView !== "list" ? "hidden lg:flex" : "flex"
        }`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-0.5">Mail Workspace</div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">Email</h1>
            {email && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/35">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                {email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/4 text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button
            onClick={openCompose}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Compose
          </button>
          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                settingsOpen
                  ? "border-white/20 bg-white/8 text-white"
                  : "border-white/10 bg-white/4 text-white/50 hover:text-white hover:bg-white/8"
              }`}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <SettingsDropdown email={email} open={settingsOpen} />
          </div>
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
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Folder nav (unified desktop + mobile, hidden in thread/compose mobile view) ── */}
        <div
          className={`flex-col border-r border-white/8 bg-[#050709] shrink-0 transition-all duration-200 ${
            mobileView !== "list" ? "hidden lg:flex" : "flex"
          } ${navExpanded ? "w-44 lg:w-52" : "w-12 lg:w-14"}`}
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

        {/* ── Thread list ── */}
        <div
          className={`flex-col border-r border-white/8 bg-[#070a0f] min-w-0 ${
            mobileView !== "list"
              ? "hidden lg:flex lg:w-80 xl:w-96 lg:shrink-0"
              : "flex flex-1 lg:flex-none lg:w-80 xl:w-96 lg:shrink-0"
          }`}
        >
          {/* List header */}
          <div className="flex items-center justify-between px-4 h-11 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-white truncate">
                {FOLDERS.find((f) => f.key === label)?.label ?? label}
              </span>
              <span className="text-xs text-white/30 shrink-0">{filtered.length} threads</span>
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

        {/* ── Right panel: compose or email view ── */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-[#06080d] ${
            mobileView === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {composeOpen ? (
            <ComposePanel
              fromEmail={email}
              onClose={closeCompose}
              onSent={closeCompose}
            />
          ) : selectedId ? (
            <EmailView
              threadId={selectedId}
              data={threadData}
              loading={loadingThread}
              onBack={closeThread}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24" className="text-white/18">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/50">No message selected</p>
                <p className="text-xs text-white/25 mt-1">Select a thread to read it here</p>
              </div>
              <button
                onClick={openCompose}
                className="mt-2 flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 text-sky-300 text-sm px-4 py-2 rounded-xl transition-colors"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                Compose new email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
