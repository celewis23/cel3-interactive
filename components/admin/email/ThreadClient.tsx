"use client";
import AttachmentChip from "./AttachmentPreview";
import ComposeAttachments from "./ComposeAttachments";
import { sendComposerMessage, attachedFilesFrom, type AttachedFile } from "./compose-files";
import { hasMessageContent } from "@/lib/gmail/mime";

// NOTE: dangerouslySetInnerHTML is used for rendering HTML email bodies.
// This is acceptable for an internal admin tool where the operator controls the Gmail account.

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { DateTime } from "luxon";
import type {
  GmailThreadDetail,
  GmailMessageParsed,
  GmailThreadLink,
} from "@/lib/gmail/types";
import EmailTagInput, { type EmailSuggestion } from "./EmailTagInput";
import {
  formatMessageDate,
  resolveCidReferences,
  extractEmail,
  extractName,
  forwardedBlockHtml,
} from "@/lib/gmail/emailViewHelpers";

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

function MessageCard({
  message,
  onReply,
  onForward,
}: {
  message: GmailMessageParsed;
  onReply: (message: GmailMessageParsed) => void;
  onForward: (message: GmailMessageParsed) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="overflow-hidden border-y border-white/10 bg-[#090b10]">
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
                <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-200">
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
        <div className="border-t border-white/5">
          {message.bodyHtml ? (
            <div
              className="bg-white px-5 py-4 overflow-x-auto text-gray-900 text-sm"
              dangerouslySetInnerHTML={{
                __html: resolveCidReferences(
                  message.bodyHtml,
                  message.id,
                  message.attachments
                ),
              }}
            />
          ) : (
            <pre className="bg-white px-5 py-4 whitespace-pre-wrap text-sm text-gray-900 font-sans leading-relaxed">
              {message.bodyText}
            </pre>
          )}

          {/* Downloadable attachments (non-inline only) */}
          {message.attachments.filter((a) => !a.inline).length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 py-4">
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

          {/* Per-message actions */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => onReply(message)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Reply
            </button>
            <button
              type="button"
              onClick={() => onForward(message)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
              Forward
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reply/forward compose panel ───────────────────────────────────────────

function ComposePanel({
  mode,
  targetLabel,
  toEmails,
  setToEmails,
  ccEmails,
  setCcEmails,
  bccEmails,
  setBccEmails,
  showCc,
  setShowCc,
  showBcc,
  setShowBcc,
  subject,
  setSubject,
  bodyHtml,
  setBodyHtml,
  files, setFiles,
  imagesLoading, setImagesLoading,
  includeAttachments,
  setIncludeAttachments,
  attachmentCount,
  recipientSuggestions,
  recipientSearchLoading,
  onRecipientInputChange,
  sending,
  error,
  onSubmit,
  onCancel,
}: {
  mode: "reply" | "forward";
  targetLabel: string;
  toEmails: string[];
  setToEmails: (v: string[]) => void;
  ccEmails: string[];
  setCcEmails: (v: string[]) => void;
  bccEmails: string[];
  setBccEmails: (v: string[]) => void;
  showCc: boolean;
  setShowCc: (v: boolean) => void;
  showBcc: boolean;
  setShowBcc: (v: boolean) => void;
  subject: string;
  setSubject: (v: string) => void;
  files: AttachedFile[];
  setFiles: (v: AttachedFile[]) => void;
  imagesLoading: boolean;
  setImagesLoading: (v: boolean) => void;
  bodyHtml: string;
  setBodyHtml: (v: string) => void;
  includeAttachments: boolean;
  setIncludeAttachments: (v: boolean) => void;
  attachmentCount: number;
  recipientSuggestions: EmailSuggestion[];
  recipientSearchLoading: boolean;
  onRecipientInputChange: (value: string) => void;
  sending: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-4 rounded-2xl border border-white/10 bg-[#090b10] p-5"
    >
      <div className="text-xs text-white/40">
        {mode === "reply" ? (
          <>Replying to <span className="text-white/70">{targetLabel}</span></>
        ) : (
          <>Forwarding message from <span className="text-white/70">{targetLabel}</span></>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">To</label>
        <EmailTagInput
          emails={toEmails}
          onChange={setToEmails}
          suggestions={recipientSuggestions}
          loadingSuggestions={recipientSearchLoading}
          onInputChange={onRecipientInputChange}
          required
        />
        <div className="mt-1.5 flex gap-3 text-xs text-white/30">
          {!showCc && (
            <button type="button" onClick={() => setShowCc(true)} className="transition-colors hover:text-white/60">
              + Cc
            </button>
          )}
          {!showBcc && (
            <button type="button" onClick={() => setShowBcc(true)} className="transition-colors hover:text-white/60">
              + Bcc
            </button>
          )}
        </div>
      </div>

      {showCc && (
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Cc</label>
          <EmailTagInput
            emails={ccEmails}
            onChange={setCcEmails}
            suggestions={recipientSuggestions}
            loadingSuggestions={recipientSearchLoading}
            onInputChange={onRecipientInputChange}
          />
        </div>
      )}

      {showBcc && (
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Bcc</label>
          <EmailTagInput
            emails={bccEmails}
            onChange={setBccEmails}
            suggestions={recipientSuggestions}
            loadingSuggestions={recipientSearchLoading}
            onInputChange={onRecipientInputChange}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">Message</label>
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          onAttachFiles={added => setFiles([...files, ...attachedFilesFrom(added)])}
          onImagesLoading={setImagesLoading}
          disabled={sending}
          placeholder={mode === "reply" ? "Write your reply…" : "Add a note (optional)…"}
          minHeight="200px"
        />
      </div>

      <ComposeAttachments files={files} onChange={setFiles} disabled={sending} />

      {mode === "forward" && attachmentCount > 0 && (
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={includeAttachments}
            onChange={(e) => setIncludeAttachments(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black accent-sky-500"
          />
          Include {attachmentCount} attachment{attachmentCount !== 1 ? "s" : ""}
        </label>
      )}

      {error && <p className="text-sm text-white/70">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending || imagesLoading || toEmails.length === 0 || (!hasMessageContent(bodyHtml) && files.length === 0)}
          className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : mode === "reply" ? "Send Reply" : "Send Forward"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
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
    <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5">
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
              className="flex-shrink-0 text-xs text-white/35 transition-colors hover:text-sky-200 disabled:opacity-50"
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
  const [composeMode, setComposeMode] = useState<"reply" | "forward" | null>(null);
  const [composeTargetId, setComposeTargetId] = useState<string | null>(null);
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<AttachedFile[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [currentLink, setCurrentLink] = useState<GmailThreadLink | null>(link);
  const [signature, setSignature] = useState("");
  const [recipientSuggestions, setRecipientSuggestions] = useState<EmailSuggestion[]>([]);
  const [recipientSearchLoading, setRecipientSearchLoading] = useState(false);
  const recipientSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-hide send success notice
  useEffect(() => {
    if (sendSuccess) {
      const t = setTimeout(() => setSendSuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [sendSuccess]);

  function handleRecipientInputChange(value: string) {
    if (recipientSearchTimeout.current) clearTimeout(recipientSearchTimeout.current);
    const query = value.trim();
    if (query.length < 2) {
      setRecipientSuggestions([]);
      setRecipientSearchLoading(false);
      return;
    }
    setRecipientSearchLoading(true);
    recipientSearchTimeout.current = setTimeout(() => {
      fetch(`/api/admin/email/recipients?q=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data: { suggestions?: EmailSuggestion[] }) => setRecipientSuggestions(data.suggestions ?? []))
        .catch(() => setRecipientSuggestions([]))
        .finally(() => setRecipientSearchLoading(false));
    }, 180);
  }

  function closeCompose() {
    setComposeFiles([]);
    setImagesLoading(false);
    setComposeMode(null);
    setComposeTargetId(null);
    setToEmails([]);
    setCcEmails([]);
    setBccEmails([]);
    setShowCc(false);
    setShowBcc(false);
    setComposeSubject("");
    setComposeBody("");
    setSendError("");
  }

  function openReply(message: GmailMessageParsed) {
    setComposeFiles([]);
    setImagesLoading(false);
    const replyTo = extractEmail(message.headers.from ?? "");
    setComposeMode("reply");
    setComposeTargetId(message.id);
    setToEmails(replyTo ? [replyTo] : []);
    setCcEmails([]);
    setBccEmails([]);
    setShowCc(false);
    setShowBcc(false);
    setComposeSubject(message.headers.subject ?? "");
    setComposeBody(signature ? `<p><br></p><p><br></p>${signature}` : "");
    setSendError("");
  }

  function openForward(message: GmailMessageParsed) {
    setComposeFiles([]);
    setImagesLoading(false);
    setComposeMode("forward");
    setComposeTargetId(message.id);
    setToEmails([]);
    setCcEmails([]);
    setBccEmails([]);
    setShowCc(false);
    setShowBcc(false);
    const subj = message.headers.subject ?? "";
    setComposeSubject(subj.startsWith("Fwd:") ? subj : `Fwd: ${subj}`);
    setIncludeAttachments(message.attachments.some((a) => !a.inline));
    setComposeBody(`<p><br></p><p><br></p>${signature}${forwardedBlockHtml(message)}`);
    setSendError("");
  }

  async function handleComposeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = messages.find((m) => m.id === composeTargetId);
    if (!composeMode || !target || toEmails.length === 0) return;
    if (imagesLoading || (!hasMessageContent(composeBody) && composeFiles.length === 0)) return;
    setSending(true);
    setSendError("");

    try {
      await sendComposerMessage({
        mode: composeMode,
        to: toEmails.join(", "), cc: ccEmails.join(", ") || undefined, bcc: bccEmails.join(", ") || undefined,
        subject: composeSubject, htmlBody: composeBody, attachments: composeFiles,
        ...(composeMode === "reply" ? {
          threadId: thread.id,
          inReplyTo: target.headers.messageId ?? "",
          references: ((target.headers.references ?? "") + " " + (target.headers.messageId ?? "")).trim(),
        } : {
          originalMessageId: target.id,
          attachmentRefs: includeAttachments ? target.attachments.filter(a => !a.inline) : undefined,
        }),
      });

      closeCompose();
      setSendSuccess(true);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Messages, each with its own reply/forward affordance and compose panel */}
        {messages.map((message) => (
          <div key={message.id}>
            <MessageCard message={message} onReply={openReply} onForward={openForward} />
            {composeMode && composeTargetId === message.id && (
              <ComposePanel
                key={`${composeMode}-${message.id}`}
                mode={composeMode}
                targetLabel={extractEmail(message.headers.from ?? "")}
                toEmails={toEmails}
                setToEmails={setToEmails}
                ccEmails={ccEmails}
                setCcEmails={setCcEmails}
                bccEmails={bccEmails}
                setBccEmails={setBccEmails}
                showCc={showCc}
                setShowCc={setShowCc}
                showBcc={showBcc}
                setShowBcc={setShowBcc}
                subject={composeSubject}
                setSubject={setComposeSubject}
                bodyHtml={composeBody}
                setBodyHtml={setComposeBody}
                files={composeFiles} setFiles={setComposeFiles}
                imagesLoading={imagesLoading} setImagesLoading={setImagesLoading}
                includeAttachments={includeAttachments}
                setIncludeAttachments={setIncludeAttachments}
                attachmentCount={message.attachments.filter((a) => !a.inline).length}
                recipientSuggestions={recipientSuggestions}
                recipientSearchLoading={recipientSearchLoading}
                onRecipientInputChange={handleRecipientInputChange}
                sending={sending}
                error={sendError}
                onSubmit={handleComposeSubmit}
                onCancel={closeCompose}
              />
            )}
          </div>
        ))}

        {/* Send success notice */}
        {sendSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
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
            Sent!
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:w-72 flex-shrink-0 space-y-4">
        {/* Thread meta */}
        <div className="rounded-2xl border border-white/10 bg-[#090b10] p-5">
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
