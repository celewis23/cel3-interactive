"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import EmailTagInput from "./EmailTagInput";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file: File;
}

interface Props {
  initialTo?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

let gapiScriptPromise: Promise<void> | null = null;
function loadGapiScript(): Promise<void> {
  if (gapiScriptPromise) return gapiScriptPromise;
  gapiScriptPromise = new Promise((resolve, reject) => {
    if (typeof window.gapi !== "undefined") { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google API"));
    document.body.appendChild(s);
  });
  return gapiScriptPromise;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function encodeTextToBase64(value: string): string {
  return encodeBytesToBase64(new TextEncoder().encode(value));
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function encodeMimeText(value: string): string {
  return wrapBase64(encodeTextToBase64(value));
}

function encodeHeader(value: string): string {
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return `=?UTF-8?B?${encodeTextToBase64(value)}?=`;
}

function escapeHeaderParam(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function encodeRfc2231Param(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function formatFilenameParams(filename: string): string {
  const params = [`filename="${escapeHeaderParam(filename)}"`];
  if (/[^\x20-\x7E]/.test(filename)) {
    params.push(`filename*=UTF-8''${encodeRfc2231Param(filename)}`);
  }
  return params.join("; ");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "  • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function buildRawGmailMessage(opts: {
  to: string;
  subject: string;
  htmlBody: string;
  cc?: string;
  bcc?: string;
  attachments?: AttachedFile[];
}): Promise<string> {
  const uid = Date.now().toString(36);
  const altBoundary = `alt_${uid}`;
  const mixBoundary = `mix_${uid}`;
  const plainBody = htmlToPlainText(opts.htmlBody);
  const hasAttachments = !!opts.attachments?.length;

  const headerLines = [
    `To: ${opts.to}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    ...(opts.bcc ? [`Bcc: ${opts.bcc}`] : []),
    `Subject: ${encodeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: ${
      hasAttachments
        ? `multipart/mixed; boundary="${mixBoundary}"`
        : `multipart/alternative; boundary="${altBoundary}"`
    }`,
  ].join("\r\n");

  const altBlock = [
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeMimeText(plainBody),
    "",
    `--${altBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeMimeText(opts.htmlBody),
    "",
    `--${altBoundary}--`,
  ].join("\r\n");

  let bodyContent = altBlock;

  if (hasAttachments) {
    const parts: string[] = [
      `--${mixBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      altBlock,
    ];

    for (const attachment of opts.attachments ?? []) {
      const bytes = new Uint8Array(await attachment.file.arrayBuffer());
      parts.push(
        `--${mixBoundary}`,
        `Content-Type: ${attachment.mimeType || "application/octet-stream"}; ${formatFilenameParams(attachment.name)}`,
        `Content-Disposition: attachment; ${formatFilenameParams(attachment.name)}`,
        "Content-Transfer-Encoding: base64",
        "",
        wrapBase64(encodeBytesToBase64(bytes))
      );
    }

    parts.push(`--${mixBoundary}--`);
    bodyContent = parts.join("\r\n");
  }

  return `${headerLines}\r\n\r\n${bodyContent}`;
}

function toBase64Url(value: string): string {
  return encodeTextToBase64(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendViaGmailApi(opts: {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
  cc?: string;
  bcc?: string;
  attachments?: AttachedFile[];
}) {
  const rawMessage = await buildRawGmailMessage(opts);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(rawMessage) }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      (data as { error?: { message?: string } }).error?.message ??
      `Failed to send email (${res.status})`;
    throw new Error(message);
  }
}

const GMAIL_ATTACHMENT_SOFT_LIMIT_BYTES = 18 * 1024 * 1024;

export default function ComposeClient({ initialTo = "" }: Props) {
  const [toEmails, setToEmails] = useState<string[]>(
    initialTo ? [initialTo] : []
  );
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [driveLoading, setDriveLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load signature on mount and pre-populate the body
  useEffect(() => {
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html }: { html: string }) => {
        if (html) setHtmlBody(`<p><br></p><p><br></p>${html}`);
      })
      .catch(() => {});
  }, []);

  function reset() {
    setToEmails(initialTo ? [initialTo] : []);
    setCcEmails([]);
    setBccEmails([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setAttachments([]);
    setSending(false);
    setDone(false);
    setError("");
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html }: { html: string }) => {
        setHtmlBody(html ? `<p><br></p><p><br></p>${html}` : "");
      })
      .catch(() => setHtmlBody(""));
  }

  function addFiles(files: File[]) {
    const next: AttachedFile[] = files.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size,
      mimeType: f.type || "application/octet-stream",
      file: f,
    }));
    setAttachments((prev) => [...prev, ...next]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function openDrivePicker() {
    setDriveLoading(true);
    try {
      const configRes = await fetch("/api/admin/email/drive-config");
      const config = await configRes.json();

      if (!config.accessToken) {
        setError("Gmail is not connected — reconnect to enable Drive access.");
        return;
      }
      if (!config.apiKey) {
        setError("GOOGLE_PICKER_API_KEY is not set. Add it to your environment variables.");
        return;
      }

      await loadGapiScript();
      await new Promise<void>((resolve) => window.gapi.load("picker", resolve));

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.RECENTLY_PICKED)
        .setOAuthToken(config.accessToken)
        .setDeveloperKey(config.apiKey)
        .setCallback((data: { action: string; docs?: { name: string; url: string; mimeType: string }[] }) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            const doc = data.docs[0];
            const event = new CustomEvent("drive-file-picked", {
              detail: { name: doc.name, url: doc.url },
            });
            window.dispatchEvent(event);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error("Drive picker error:", err);
      setError("Could not open Drive picker. Check that Drive scope is authorized (reconnect Gmail if needed).");
    } finally {
      setDriveLoading(false);
    }
  }

  const htmlBodyRef = useRef(htmlBody);
  htmlBodyRef.current = htmlBody;
  const setHtmlBodyRef = useRef(setHtmlBody);
  setHtmlBodyRef.current = setHtmlBody;

  const driveListenerRegistered = useRef(false);
  if (!driveListenerRegistered.current && typeof window !== "undefined") {
    driveListenerRegistered.current = true;
    window.addEventListener("drive-file-picked", (e: Event) => {
      const { name, url } = (e as CustomEvent<{ name: string; url: string }>).detail;
      const link = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">📄 ${name}</a></p>`;
      setHtmlBodyRef.current((prev) => prev + link);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (toEmails.length === 0 || !subject.trim() || !htmlBody.trim()) return;
    setSending(true);
    setError("");

    try {
      if (attachments.length > 0) {
        const totalAttachmentSize = attachments.reduce(
          (sum, att) => sum + att.size,
          0
        );
        if (totalAttachmentSize > GMAIL_ATTACHMENT_SOFT_LIMIT_BYTES) {
          throw new Error(
            "Attachments are too large for Gmail. Keep total attachments under about 18 MB, or use Drive links instead."
          );
        }

        const configRes = await fetch("/api/admin/email/drive-config");
        const config = await configRes.json().catch(() => ({}));
        if (!configRes.ok || !config.accessToken) {
          throw new Error(
            "Gmail is not connected. Reconnect Gmail and try again."
          );
        }

        await sendViaGmailApi({
          accessToken: config.accessToken as string,
          to: toEmails.join(", "),
          subject: subject.trim(),
          htmlBody,
          cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
          bcc: bccEmails.length > 0 ? bccEmails.join(", ") : undefined,
          attachments,
        });
      } else {
        const fd = new FormData();
        fd.append("to", toEmails.join(", "));
        fd.append("subject", subject.trim());
        fd.append("htmlBody", htmlBody);
        if (ccEmails.length > 0) fd.append("cc", ccEmails.join(", "));
        if (bccEmails.length > 0) fd.append("bcc", bccEmails.join(", "));

        const res = await fetch("/api/admin/email/send", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`
          );
        }
      }

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#090b10] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/12">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-sky-300">
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
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Compose another
          </button>
          <Link
            href="/admin/email"
            className="bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 text-white/70 hover:text-white text-sm px-4 py-2 rounded-xl transition-colors"
          >
            Back to Inbox
          </Link>
        </div>
      </div>
    );
  }

  const isEmpty = !htmlBody.replace(/<[^>]*>/g, "").trim();

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-[#090b10] p-6">
      {/* To */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-white">To</label>
          <div className="flex gap-3">
            {!showCc && (
              <button type="button" onClick={() => setShowCc(true)} className="text-xs text-sky-200 transition-colors hover:text-white">
                + CC
              </button>
            )}
            {!showBcc && (
              <button type="button" onClick={() => setShowBcc(true)} className="text-xs text-sky-200 transition-colors hover:text-white">
                + BCC
              </button>
            )}
          </div>
        </div>
        <EmailTagInput
          emails={toEmails}
          onChange={setToEmails}
          placeholder="recipient@example.com — press Enter or comma to add"
          required
        />
      </div>

      {/* CC */}
      {showCc && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-white">CC</label>
            <button
              type="button"
              onClick={() => { setShowCc(false); setCcEmails([]); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Remove
            </button>
          </div>
          <EmailTagInput
            emails={ccEmails}
            onChange={setCcEmails}
            placeholder="cc@example.com"
          />
        </div>
      )}

      {/* BCC */}
      {showBcc && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-white">BCC</label>
            <button
              type="button"
              onClick={() => { setShowBcc(false); setBccEmails([]); }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Remove
            </button>
          </div>
          <EmailTagInput
            emails={bccEmails}
            onChange={setBccEmails}
            placeholder="bcc@example.com"
          />
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-white mb-1.5">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Email subject"
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-sm text-white placeholder-white/25 transition-colors focus:border-sky-400/50 focus:outline-none"
        />
      </div>

      {/* Rich text body */}
      <div>
        <label className="block text-sm font-medium text-white mb-1.5">Message</label>
        <RichTextEditor
          value={htmlBody}
          onChange={setHtmlBody}
          placeholder="Write your message…"
          minHeight="420px"
          editorHeight="clamp(420px, calc(100vh - 26rem), 640px)"
        />
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-3 py-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/40 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              <span className="flex-1 text-sm text-white/80 truncate">{att.name}</span>
              <span className="text-xs text-white/35 shrink-0">{formatBytes(att.size)}</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="text-white/30 hover:text-red-400 transition-colors shrink-0"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {/* Send */}
        <button
          type="submit"
          disabled={sending || toEmails.length === 0 || !subject.trim() || isEmpty}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {sending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Send
            </>
          )}
        </button>

        {/* Attach file */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
          title="Attach file"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          Attach
        </button>

        {/* Google Drive */}
        <button
          type="button"
          onClick={openDrivePicker}
          disabled={driveLoading}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
          title="Insert from Google Drive"
        >
          {driveLoading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 87.3 78" fill="currentColor">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 49.5C.4 50.9 0 52.45 0 54h27.5z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
              <path d="M59.8 54H27.5L13.75 77.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/>
              <path d="M73.4 27.5l-12.65-21.8c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 29h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
            </svg>
          )}
          Drive
        </button>

        <div className="flex-1" />

        {/* Cancel */}
        <Link
          href="/admin/email"
          className="rounded-xl border border-white/10 bg-black px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          Cancel
        </Link>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            addFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />
    </form>
  );
}
